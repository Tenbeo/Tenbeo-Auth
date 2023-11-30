import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { appsModel } from "../models/apps.model";
import { IAppForList, TTableApps } from "../db/schema.db";
import { replyJsonFromError } from "../utils/api.utils";
import { tenbeoAdminSlug } from "../server";
import { slugify } from "@zouloux/ecma-core";
import { sessionService } from "../services/session.service";

export function attachAppsAPI ( base:string, server:FastifyInstance )
{
	// Every endpoint of this API should have a connected user which subscribes to admin app
	sessionService.limitEndpointToAppScope( server, `${base}/apps/`, tenbeoAdminSlug )

	// --- List all apps
	server.get( `${base}/apps/`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		const allApps = appsModel.getAllWithUserCount().map( (app:IAppForList) => {
			if ( app.slug === tenbeoAdminSlug )
				app.locked = true
			return app
		})
		reply.send( allApps )
	})

	// --- Get an app by id
	server.get( `${base}/apps/:appId`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		const appId = parseFloat( request.params['appId'] )
		const oneApp = appsModel.getOneById( appId )
		reply.send( oneApp )
	})

	// --- Create a new app
	server.post( `${base}/apps/create`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		// Get app from body
		const app = request.body as Omit<TTableApps, "id">
		// Force slug name
		app.slug = slugify( app.slug )
		try {
			return appsModel.create( app )
		}
		catch ( error ) {
			return replyJsonFromError('unable_to_save_resource', reply, error, 500)
		}
	})

	// --- Update app by id
	server.patch( `${base}/apps/:appId`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		// Do not allow modification of main app
		const appId = parseFloat( request.params['appId'] )
		if ( appId == appsModel.getOneBySlug( tenbeoAdminSlug ).id )
			return replyJsonFromError("cannot_mutate_app", reply, null, 400)
		// Get app from body
		let app = request.body as TTableApps
		app.id = appId
		// Force slug name
		app.slug = slugify( app.slug )
		try {
			return appsModel.update( app )
		}
		catch ( error ) {
			return replyJsonFromError('unable_to_save_resource', reply, error, 500)
		}
	})

	// --- Delete app by id
	server.delete( `${base}/apps/:appId`, async ( request:FastifyRequest, reply:FastifyReply ) => {
		// Do not allow modification of main app
		const appId = parseFloat( request.params['appId'] )
		if ( appId == appsModel.getOneBySlug( tenbeoAdminSlug ).id )
			return replyJsonFromError("cannot_mutate_app", reply, null, 400)
		try {
			return appsModel.delete( appId )
		}
		catch ( error ) {
			return replyJsonFromError('unable_to_delete_resource', reply, error, 500)
		}
	})
}