import esbuild from "esbuild"
import { spawn } from "child_process"
import { Signal } from "@zouloux/signal"
import { newLine, nicePrint, oraTask, parseArguments, clearScreen } from "@zouloux/cli";
import { delay } from "@zouloux/ecma-core";

// ----------------------------------------------------------------------------- LOGGER

// TODO : To CLI with an interface ?
const defaultLogger = {
	prefix: '{d}server{/} - ',
	noPrefixOnNextLine: false,
	print ( content, options ) { // TODO : add type or level ( regular / important / warning / success / error / ... for styling )
		if ( !this.noPrefixOnNextLine )
			content = this.prefix + content
		nicePrint( content, options )
		this.noPrefixOnNextLine = ( options && !options.newLine )
	},
	error ( message, code ) {
		console.error( message )
	},
	async printFormattedError ( text, location, kind = "error" ) {
		const formatted = await esbuild.formatMessages([
			{ text, location },
		], {
			kind,
			color: true,
			terminalWidth: 80,
		})
		console.log( formatted.join('\n') )
	},
	clear () {
		clearScreen( false )
	}
}

// ----------------------------------------------------------------------------- CONFIG

// Config and args are module scoped
let _config;
let _args;

// ----------------------------------------------------------------------------- DEV SERVER

let _serverInstance
let _onServerExitSignal = Signal()
let _serverBusyLocked = false
let _buildContext

const onServerExit = () => new Promise( resolve => {
	if (!_serverInstance) resolve();
	_onServerExitSignal.add( resolve )
})

async function startServer () {
	_serverBusyLocked = true;
	_config.logger.print(`{b/c}Spawning server {/}{d}- ${_config.dev.command}`)
	// Generate command and spawn a new sub-process
	const args = _config.dev.command.split(" ")
	_serverInstance = spawn(args.shift(), args, {
		cwd: _config.dev.cwd ?? process.cwd(),
		env: _config.env,
		stdio: 'inherit'
	});
	// Listen for server exit / crashes
	_serverInstance.once('exit', async ( code ) => {
		// Unlock server business
		_serverBusyLocked = false;
		// If there are no listeners yet, the process crashed at init
		if ( _onServerExitSignal.listeners.length === 0 )
			_config.logger.print(`{b/r}Server ${code === 0 ? 'stopped' : 'crashed'} at init ${ code === 0 ? 'without error code' : 'with code '+code}.`)
		// Dispatch for exit listeners and clean
		_onServerExitSignal.dispatch( code );
		_onServerExitSignal.clear();
		_serverInstance.removeAllListeners();
		_serverInstance = null
		// Wait for file changes to rebuild
		if ( _onServerExitSignal.listeners.length > 0 )
			_config.logger.print(`{b/c}Waiting for file change...`)
	})
	// TODO : Implement lock to avoid parallel serverInstances running
	_serverBusyLocked = false
}

async function stopServer () {
	if ( !_serverInstance ) return;
	_serverBusyLocked = true
	//await delay(1)
	await oraTask(`Stopping server`, t => new Promise( resolve => {
		onServerExit().then( async code => {
			t.success('Server stopped')
			_serverBusyLocked = false
			resolve()
		})
		// FIXME : Other signals to force exit ?
		// FIXME : 'SIGINT' // force ? "SIGKILL" : "SIGTERM"
		_serverInstance.kill( _config.dev.killSignal ?? 'SIGINT' );
	}))
}

// ----------------------------------------------------------------------------- START

function defineBuildConfig ( configHandler ) {
	// Parse arguments and store in module scope
	_args = parseArguments({
		flagAliases: {
			d: 'dev'
		},
		defaultFlags: {
			dev: false
		}
	})
	// Get user config
	let userConfig
	if ( typeof configHandler === "function" )
		userConfig = configHandler({
			dev: _args.flags.dev
		})
	else if ( typeof configHandler === "object" && !Array.isArray(configHandler) ) {
		userConfig = configHandler
	}
	else {
		nicePrint(`{b/r}Invalid config ${configHandler}`, {
			code: 1
		})
	}
	// Check inconsistencies
	// No IO
	if ( !userConfig.input || !userConfig.output ) {
		nicePrint(`{b/r}Invalid config ${configHandler}, missing parameters.`, {
			code: 2
		})
	}
	// Dev mode but no dev config
	if ( _args.dev && !_config.dev ) {
		nicePrint(`{b/r}Please set dev config to use dev mode.`, {
			code: 3
		})
	}
	// Compute config from default and user config
	// Store in module scope
	_config = {
		logger: defaultLogger,
		esOptions: {},
		...userConfig
	}
	// Compute default env from config
	if ( typeof _config.env === "undefined" )
		_config.env = process.env
	else if ( typeof _config.env === "function" )
		_config.env = _config.env()
}

// ----------------------------------------------------------------------------- BUILD

async function buildFailed ( error, code = 1 ) {
	_config.logger.print(`{b/r}Build failed`)
	// _config.logger.error( error )
	if ( error.errors )
		for ( const e of error.errors )
			await _config.logger.printFormattedError( e.text, e.location, "error" )
	if ( error.warning )
		for ( const e of error.warnings )
			await _config.logger.printFormattedError( e.text, e.location, "warning" )

	code > 0 && process.exit( code );
}

function buildResult ( result, isFirst = false ) {
	result.warnings.forEach( w => _config.logger.print(`{b/o}Warn > ${w}`) )
	result.errors.length === 0 && _config.logger.print(isFirst ? `{b/g} success`: `{b/g}Build success`);
}

function buildFinished ( result, allowExit = true ) {
	// Halt on build error
	if ( result.errors.length > 0 ) {
		buildFailed( result, allowExit ? 1 : 0 )
		return true
	}
	buildResult( result )
	return false
}

/**
 * Force node_modules imports to be kept in esbuild output.
 * Usually, node_modules are included into bundle or translated to something like
 * ../../node_modules/@zouloux/cli/dist/index.js
 * With this plugin, output will be kept as import("@zouloux/cli")
 */
const keepNodeModulesPlugin = {
	name: 'keep-node-modules',
	setup ( build ) {
		// Intercept resolution of node modules
		// ✅ child_process
		// ✅ minimist
		// ✅ @zouloux/cli
		// ❌ ./other-file.js
		// ❌ ../other-file.js
		build.onResolve({ filter: /^[a-zA-Z0-9_\-@](.*)/ }, async () => {
			// Force it to be an external resource
			return { external: true }
		})
	}
}

/**
 * TODO : DOC
 */
let isFirst = true
const buildEventsPlugin = {
	name: "build-events",
	setup ( build ) {
		build.onEnd( async results => {
			if ( !isFirst )
				_config.logger.clear()
			else
				isFirst = false
			// Show success, warnings and errors
			const hasErrors = buildFinished( results, false )
			// TODO : Configurable delays
			await delay( .1 )
			while ( _serverBusyLocked )
				await delay( .1 )
			await stopServer()
			// Restart dev server after rebuild if it has no build error
			if ( !hasErrors )
				startServer()
		})
	}
}

export async function buildServer ( configHandler ) {
	defineBuildConfig( configHandler )
	// Print without line jump for the "success"
	if ( _args.flags.dev )
		_config.logger.clear()
	_config.logger.print(`{b/c}Building server ... `, { newLine: false })
	// Build server
	try {
		let internalPlugins = [ keepNodeModulesPlugin ]
		if ( _args.flags.dev )
			internalPlugins.push( buildEventsPlugin )
		if ( _config.esOptions?.plugins )
			internalPlugins = [ ...internalPlugins, ..._config.esOptions?.plugins ]
		// Create context
		_buildContext = await esbuild.context({
			// Compiler defaults
			target: "node18",
			platform: 'node',
			format: 'esm',
			minify: false,
			bundle: true,
			// Inject custom es options before forced options
			..._config.esOptions,
			// Force internal plugins
			plugins: internalPlugins,
			// FIXME
			logLevel: 'silent',
			// Forced options (not available in config)
			entryPoints: [ _config.input ],
			outfile: _config.output,
		})
		// Start watch mode
		if ( _args.flags.dev ) {
			await _buildContext.watch()
		}
		// Start build mode
		else {
			// TODO : tsc -noEmit in build mode only
			const results = await _buildContext.rebuild()
			buildFinished( results )
			await _buildContext.dispose()
		}
	}
	// Display errors
	catch ( error ) {
		newLine()
		buildFailed( error )
	}
}
