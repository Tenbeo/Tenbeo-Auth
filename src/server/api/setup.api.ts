import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { userModel } from "../models/user.model";
import fastifyFormbody from "@fastify/formbody";
import { parseBoolean, untab } from "@zouloux/ecma-core";
import { appsModel } from "../models/apps.model";
import { tenbeoAdminSlug } from "../server";

const setupForm = ( props ) => untab(`
	<h1>Setup</h1>
	<form action="${ props.action }" method="${ props.method }">
		<label>
			<span>Name :</span>
			<input name="name" />
		</label>
		<label>
			<span>Public key :</span>
			<input name="publicKey" />
		</label>
		<input type="submit" value="Submit" />
	</form>
`)

const successMessage = ( props ) => untab(`
	<h1>Success</h1>
	<a href="${ props.admin }">Go to admin</a>
`)

// Check if admin app has users
function doesAdminAppHasUsers () {
	const tenbeoApp = appsModel.getOneBySlug( tenbeoAdminSlug )
	return appsModel.getUsersOfAppId( tenbeoApp.id ).length > 0
}

/**
 * This API will enable a backend to create an admin user and attach it to the admin app.
 * It will only be enabled if TENBEO_AUTH_ALLOW_SETUP in dot env is true
 * And if the admin app does not already have a user.
 * So, if you remove the last admin user, this API is enabled until you create a new one.
 */
export function attachSetupAPI ( base:string, server:FastifyInstance ) {
	// The super admin setup page can be disabled from dot env
	const allowSetup = parseBoolean( process.env.TENBEO_AUTH_ALLOW_SETUP )
	if ( !allowSetup ) return
	// We need this plugin to get the setup form fields
	server.register( fastifyFormbody )
	// Listen for get and post to allow user to create an admin user
	const endpoint = "/setup"
	server.all(endpoint, (request:FastifyRequest, reply:FastifyReply) => {
		// Check method and total users
		// Do not allow this page if we already have users in database
		const hasUsers = doesAdminAppHasUsers()
		// Show form
		const { method } = request
		if ( !hasUsers && method === "GET" ) {
			const template = setupForm({
				action: endpoint,
				method: "post"
			})
			reply.type("text/html").send( template )
		}
		// Handle form submit
		else if ( !hasUsers && method === "POST" ) {
			// Create user and subscribe it to the admin app
			// @ts-ignore
			const { name, publicKey } = request.body
			let createdUserId = 0
			try {
				createdUserId = userModel.createAdminUser(name, publicKey)
			}
			catch ( error ) {}
			// Show success or error
			const template = (
				createdUserId === 0 ? `An error occurred`
				: successMessage({
					admin: process.env.TENBEO_AUTH_CLIENT_ADMIN_BASE
				})
			)
			reply.type("text/html").send( template )
		}
		return reply.status(404).send("Not found")
	})
}