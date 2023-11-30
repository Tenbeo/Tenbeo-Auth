import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IUserWithSubscribedApps } from "../db/schema.db";
import { checkJSONValidity, replyJsonFromError } from "../utils/api.utils";
import { userModel } from "../models/user.model";
import { appsModel } from "../models/apps.model";
import { sessionService } from "../services/session.service";
import { tenbeoAdminSlug } from "../server";

export function attachUserAPI ( base:string, server:FastifyInstance )
{
	// Every endpoint of this API should have a connected user which subscribes to admin app
	sessionService.limitEndpointToAppScope( server, `${base}/users/`, tenbeoAdminSlug )

	// --- List all users
	server.get( `${base}/users/`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		const allUsers = userModel.getAllUsersWithTheirAppSubscription()
		reply.send( allUsers )
	})

	// --- Get a user by id
	server.get( `${base}/users/:userId`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		// Get user id from parameters
		let userId = request.params['userId']
		// Special case, with new as id, we have to send back all apps list for the view
		if ( userId === "new" ) {
			return reply.send({
				appsSubscriptions: appsModel.getAll()
			})
		}
		// Get user by ID
		userId = parseFloat( userId )
		const oneUser = userModel.getOneById( userId )
		// not found
		if ( !oneUser )
			return reply.status(404).send({ error: "not-found" })
		// Get apps subscriptions for this user
		reply.send({
			...oneUser,
			appsSubscriptions: userModel.getUserAppSubscriptions( userId )
		})
	})

	// --- Create a new user
	server.post( `${base}/users/create`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		const user = request.body as Omit<IUserWithSubscribedApps, "id">
		if ( !checkJSONValidity(user.data, reply) )
			return replyJsonFromError('invalid_json', reply, null, 400)
		try {
			const userId = userModel.create( user )
			if ( user.appsSubscriptions ) {
				userModel.setUserAppSubscriptions( userId, user.appsSubscriptions )
				delete user.appsSubscriptions
			}
			reply.send({ success: true })
		}
		catch ( error ) {
			return replyJsonFromError('unable_to_save_resource', reply, error, 500)
		}
	})

	// --- Update user by id
	server.patch( `${base}/users/:userId`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		const user = request.body as IUserWithSubscribedApps
		user.id = parseFloat( request.params['userId'] )
		if ( !checkJSONValidity(user.data, reply) )
			return replyJsonFromError('invalid_json', reply, null, 400)
		try {
			if ( user.appsSubscriptions ) {
				userModel.setUserAppSubscriptions( user.id, user.appsSubscriptions )
				delete user.appsSubscriptions
			}
			userModel.update( user )
			reply.send({ success: true })
		}
		catch ( error ) {
			return replyJsonFromError('unable_to_save_resource', reply, error, 500)
		}
	})

	// --- Delete user by id
	server.delete( `${base}/users/:userId`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		const userId = parseFloat( request.params['userId'] )
		try {
			userModel.delete( userId )
			reply.send({ success: true })
		}
		catch ( error ) {
			return replyJsonFromError('unable_to_delete_resource', reply, error, 500)
		}
	})
}