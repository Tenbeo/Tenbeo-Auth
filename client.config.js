import esbuild from "esbuild";
import { htmlPlugin } from "@craftamap/esbuild-plugin-html"
import { livereloadPlugin } from "@jgoz/esbuild-plugin-livereload"
import { lessLoader } from 'esbuild-plugin-less';
import * as fs from "fs";
import { parseArguments } from "@zouloux/cli";
import { config } from "dotenv";
import path from "path";

// ----------------------------------------------------------------------------- ARGUMENTS
// Parse arguments and store in module scope
const _args = parseArguments({
	flagAliases: {
		d: 'dev'
	},
	defaultFlags: {
		dev: false
	}
})
const isDev = _args.flags.dev

// ----------------------------------------------------------------------------- MAIN OPTIONS
const servePort = false
const appBase = "src/"
const apps = [ "admin" ]
const outDir = "dist/"

// ----------------------------------------------------------------------------- ENVS
// Dot envs and defines
const envs = config({
	path: ".env",
	override: false,
})
// Convert dot envs to defines instructions.
// Keep only allowed prefixes to avoid dot env leaking into the bundle
const dotEnvPrefixes = ["TENBEO_AUTH_CLIENT_"]
const defines = {}
Object.keys(envs.parsed).forEach( key => {
	const prefixes = dotEnvPrefixes.filter( prefix => key.startsWith(prefix) )
	if ( prefixes.length === 0 )
		return
	defines[`process.env.${key}`] = `"${envs.parsed[key]}"`
})

// ----------------------------------------------------------------------------- PLUGINS
const appPaths = apps.map( appName => path.join( appBase, appName ) )
const plugins = [
	htmlPlugin({
		files: appPaths.map( appPath => {
			return {
				entryPoints: [ path.join( appPath, "index.tsx" ) ],
				filename: `${path.basename(appPath)}/index.html`,
				htmlTemplate: fs.readFileSync( path.join( appPath, "index.html" ) ),
				scriptLoading: "defer",
				hash: true,
				define: envs.parsed
			}
		})
	}),
	lessLoader(),
]
if ( isDev )
	plugins.push( livereloadPlugin() )

// ----------------------------------------------------------------------------- BUILD CONTEXT
// Create build context
const _buildContext = await esbuild.context({
	target: [ 'chrome58', 'edge18', 'firefox57', 'safari11' ],
	platform: "browser",
	format: "iife",
	// FIXME : Css module collisions
	// https://github.com/evanw/esbuild/issues/3484
	//minify: !isDev,
	minify: false,
	bundle: true,
	loader: {
		'.tsx' : 'tsx',
		'.less' : 'css',
		//'.module.less' : 'css',
		'.png': 'dataurl',
		'.jpg': 'dataurl',
	},
	assetNames: '[hash]',
	chunkNames: '[hash]',
	metafile: true,
	write: true,
	plugins: plugins,
	logLevel: "info",
	outbase: appBase,
	entryPoints: appPaths.map( appPath => path.join( appPath, "index.tsx" ) ),
	outdir: outDir,
	define: defines,
	alias: {
		'react': 'preact/compat',
		'react-dom': 'preact/compat'
	}
})

// ----------------------------------------------------------------------------- DEV OR BUILD

// Dev mode
if ( isDev ) {
	if ( typeof servePort === "number" ) {
		_buildContext.serve({
			port: servePort,
			servedir: outDir
		})
	}
	await _buildContext.watch()
}
// Build mode
else {
	const results = await _buildContext.rebuild()
	await _buildContext.dispose()
}
