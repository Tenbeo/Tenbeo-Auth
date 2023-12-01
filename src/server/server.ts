import { fastify } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { resolve } from "path";
import { readFileSync } from "fs";
import { nicePrint, oraTask, parseArguments, askInput } from "@zouloux/cli";
import { config } from "dotenv"
import { attachAuthAPI } from "./api/auth.api";
import { dbMigrate } from "./db/migrate.db";
import fastifyStatic from "@fastify/static"
import { attachUserAPI } from "./api/user.api";
import { attachFrontApp, getFastifyRewriteHandler, registerFastifyRewrite } from "./utils/fastify.utils";
import { attachAppsAPI } from "./api/apps.api";
import { sessionService } from "./services/session.service";
import { appsModel } from "./models/apps.model";
import { userModel } from "./models/user.model";
import { attachSetupAPI } from "./api/setup.api";
import { attachJSLibAPI } from "./api/jslib.api";

// ----------------------------------------------------------------------------- OPTIONS & ENV

// Parse argv
const args = parseArguments({
	flagAliases: {
		p: 'port',
		d: 'dev',
	}
})
// Default port from argv
const port = ( args.flags.port ?? ( args.flags.dev ? 3000 : 80 ) ) as number

// Load dot env
config({ path: resolve('../.env') })

// Load package json version
let _packageVersion = "unknown"
try {
	_packageVersion = JSON.parse( readFileSync( resolve("../package.json"), "utf8" ) ).version
}
catch (e) {}
nicePrint(`Tenbeo auth server - {d}v${_packageVersion}`)

// ----------------------------------------------------------------------------- MIGRATE & SETUP

await oraTask(`Migrate database`, async t => {
	try {
		dbMigrate()
		t.success(`Database ready`)
	}
	catch ( error ) {
		t.error(`Unable to migrate db`)
		console.error( error )
		process.exit(1)
	}
})

// Create main app if not already existing
export const tenbeoAdminSlug = "tenbeo-admin" // to dot env ?
let adminApp = appsModel.getOneBySlug( tenbeoAdminSlug )
if ( !adminApp ) {
	await oraTask(`Creating main app ${tenbeoAdminSlug}`, t => {
		try {
			appsModel.create({
				slug: tenbeoAdminSlug,
				allowedHosts: [""] // empty string means -> allow only current host
			})
			// Re-query the app after creation because adminApp var is used later
			adminApp = appsModel.getOneBySlug( tenbeoAdminSlug )
			t.success(`${tenbeoAdminSlug} app created.`)
		}
		catch ( error ) {
			t.error(`Unable to create main app ${tenbeoAdminSlug}`)
			console.error( error )
			process.exit(1)
		}
	})
}

// Special flag
// Do not start the server, but add an admin user and subscribes it to the admin app
if ( args.flags['add-admin-user'] ) {
	// Get arguments from CLI
	const name 		= args.arguments[0] ?? await askInput("Name of admin", { notEmpty: true })
	const publicKey = args.arguments[1] ?? await askInput("Tenbeo public key of admin", { notEmpty: true, })
	await oraTask(`Creating user`, t => {
		try {
			userModel.createAdminUser( name, publicKey )
			t.success(`User ${ name } created and associated to app ${ adminApp.slug }`)
		}
		catch (error) {
			t.error(`Unable to create user`)
			console.error( error )
			process.exit(1)
		}
	})
	process.exit(0);
}

// ----------------------------------------------------------------------------- SERVER INIT & CONFIG

// Create configured fastify server
const _server = fastify({
	rewriteUrl: getFastifyRewriteHandler()
})
_server.register( fastifyCookie )

// ----------------------------------------------------------------------------- APIS
// Attaching REST-like APIs

const _apiBase = `/api/1.0`
attachAuthAPI( _apiBase, _server, port )
attachUserAPI( _apiBase, _server )
attachAppsAPI( _apiBase, _server )
attachSetupAPI( _apiBase, _server )
attachJSLibAPI( _apiBase, _server )

// ----------------------------------------------------------------------------- APPS
// Boot up front-end applications

attachFrontApp(_server, {
	root: resolve("admin/"),
	baseURI: process.env.TENBEO_AUTH_CLIENT_ADMIN_BASE,
})

// ----------------------------------------------------------------------------- SERVER START

await oraTask(`Starting server on port ${port}`, async t => {
	await _server.listen({ host: '0.0.0.0', port })
	t.success(`Server started on port ${port}`)
})

// ----------------------------------------------------------------------------- SERVICES
// Start session service to clean sessions in database

sessionService.startSessionWatcher()
