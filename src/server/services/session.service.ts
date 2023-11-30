import { clearInterval } from "node:timers";
import { sessionModel } from "../models/session.model";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { appsModel } from "../models/apps.model";
import { getRequestOriginWithFallbacks, injectCorsHeaders } from "../utils/fastify.utils";
import { TTableApps, TTableSession } from "../db/schema.db";
import { userModel } from "../models/user.model";
import { catchAllRequestsBeyondEndpoint, replyJsonFromError } from "../utils/api.utils";

function sessionWatcher () {
	const expiredPendingSessions = sessionModel.getExpiredSessions("PENDING")
	const expiredValidatedSessions = sessionModel.getExpiredSessions("VALIDATED")
	const expiredExpiredSessions = sessionModel.getExpiredSessions("EXPIRED")
	// console.log("WATCH SESSIONS", {
	// 	expiredPendingSessions, expiredValidatedSessions, expiredExpiredSessions,
	// })

	// Change expired PENDING and VALIDATED to EXPIRED
	// FIXME : Do the loop in SQL, is it more perf with SQLite ?
	;[...expiredPendingSessions, ...expiredValidatedSessions].forEach( session =>
		sessionModel.changeSessionType( session.id, "EXPIRED" )
	)
	// Delete expired EXPIRED
	;expiredExpiredSessions.forEach( session =>
		sessionModel.removeSession( session.id )
	)
}



export const sessionService = {
	/**
	 * Start checking sessions status in an interval of X seconds.
	 * Will change sessions status to Expired, and will clean Expired ones later.
	 * @param interval Check interval in seconds.
	 */
	startSessionWatcher ( interval = 10 ) {
		sessionWatcher()
		const id = setInterval( sessionWatcher, interval * 1000 )
		return () => clearInterval( id )
	},

	// ------------------------------------------------------------------------- COOKIE <=> SESSION

	computeSessionCookieName ( appSlug:string ):string {
		const cookieNameBase = process.env.TENBEO_AUTH_SESSION_COOKIE_NAME
		return `${cookieNameBase}/${appSlug}`
	},

	getSessionIdFromRequest ( request:FastifyRequest, appSlug:string ):string {
		const cookieName = sessionService.computeSessionCookieName( appSlug )
		return request.cookies[ cookieName ]
	},

	retrieveSessionFromRequest ( request:FastifyRequest, appSlug:string ):TTableSession {
		const sessionId = sessionService.getSessionIdFromRequest( request, appSlug )
		return sessionModel.retrieveSession( sessionId )
	},

	/**
	 * This method will check if the user behind the request is allowed to use a specific app.
	 * Can reply errors.
	 * If its returns false, do not continue further.
	 */
	confirmSession ( request:FastifyRequest, reply:FastifyReply, appSlug:string ):TTableSession|false {
		// Get session from request
		const session = sessionService.retrieveSessionFromRequest( request, appSlug )
		if ( !session ) {
			replyJsonFromError("invalid_session", reply, null, 401 )
			return false
		}
		// Check if user subscribes to the app in this session
		const subscribes = userModel.checkIfUserSubscribesToApp( session.userId, session.appId )
		if ( !subscribes ) {
			replyJsonFromError( "user_does_not_subscribes", reply, null, 403 );
			return false
		}
		return session
	},

	checkRequestOriginForApp ( request:FastifyRequest, appSlug:string ) {
		const app = appsModel.getOneBySlug( appSlug )
		if ( !app )
			return false
		// Get request origin
		const requestOrigin = getRequestOriginWithFallbacks( request )
		const allowedHosts = (app.allowedHosts as string[] ?? [])
		if ( !Array.isArray(allowedHosts) || allowedHosts.length === 0 )
			throw new Error(`invalid_app_allowed_hosts`)
		// Allow only current origin ( one empty line )
		// Simple, we do not provide any CORS instructions.
		// The browser will allow the request because if it's on the same domain
		// and refuse if it's on an other.
		if ( allowedHosts.length === 1 && allowedHosts[0].trim() === "" )
			return true
		return !!allowedHosts.find( host => host === requestOrigin )
	},

	/**
	 * Will check request's origin and validate that it's authorized for this app.
	 * If this is allowed, CORS headers will be injected into reply.
	 * Can reply errors.
	 * If its returns false, do not continue further.
	 */
	checkRequestOriginForAppAndValidateCors ( request:FastifyRequest, reply:FastifyReply, appSlug:string ):boolean {
		// Check if this app allows this request origin
		if ( !sessionService.checkRequestOriginForApp( request, appSlug ) ) {
			replyJsonFromError("unauthorized_session", reply, null, 403 )
			return false
		}
		// Allowed, inject cors to allow browser
		if ( !injectCorsHeaders({ reply, request }) )
			return false // option 200 preflight
		return true
	},

	/**
	 * Will catch any request from and after endpoint.
	 * Request without confirmed session or without correct origin will be prohibited.
	 * Confirmed session will have cors enabled.
	 */
	limitEndpointToAppScope ( server:FastifyInstance, endpoint:string, appSlug:string ) {
		// All request after endpoint will be caught and verified
		catchAllRequestsBeyondEndpoint( server, endpoint, ( request:FastifyRequest, reply:FastifyReply) => {
			// Check request origin and send cors headers if ok
			if ( !sessionService.checkRequestOriginForAppAndValidateCors( request, reply, appSlug) )
				return
			// Check if user has a valid session for this app
			if ( !sessionService.confirmSession( request, reply, appSlug ) )
				return
		})
	},
}