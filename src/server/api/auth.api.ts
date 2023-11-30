import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validateSignature } from "../utils/crypto.utils";
import QRCode from "qrcode"
import { TTableSession } from "../db/schema.db";
import { replyJsonFromError } from "../utils/api.utils";
import { sessionModel } from "../models/session.model";
import { userModel } from "../models/user.model";
import { appsModel } from "../models/apps.model";
import { sessionService } from "../services/session.service";

// ----------------------------------------------------------------------------- TYPES

interface IValidationPayload {
	signature		:string
	message			:string
	public_key		:string
}

// ----------------------------------------------------------------------------- QR CODE HELPERS

export function generateSessionQR ( url:string ):Promise<string> {
	return new Promise( (resolve, reject) => {
		QRCode.toDataURL(
			url,
			{ type: "image/png" },
			( err, code ) => err ? reject( err ) : resolve( code )
		);
	})
}

// ----------------------------------------------------------------------------- API

export function attachAuthAPI ( base:string, server:FastifyInstance, port?:number ) {

	// ------------------------------------------------------------------------- ENVS

	const sessionCookieLifetime = parseFloat( process.env.TENBEO_AUTH_SESSION_COOKIE_LIFE_TIME )
	const pingBackURL = process.env.TENBEO_AUTH_PINGBACK_URL
	const tenbeoAppURL = process.env.TENBEO_AUTH_APP_REDIRECT_URL

	// ------------------------------------------------------------------------- CREATE SESSION

	// Ping-back validation URL
	const serverAddressWithPort = ( port && port !== 80 ) ? `${pingBackURL}:${port}` : pingBackURL
	const createValidationURL = ( uid:string ) => `${serverAddressWithPort}${base}/auth/validate/${uid}`

	// Will push session id to user via cookie, and refresh the expiration date.
	function pushSessionCookie ( appSlug:string, sessionId:string, reply:FastifyReply ) {
		// Set cookie for this uniqId
		reply.setCookie( sessionService.computeSessionCookieName( appSlug ), sessionId, {
			path: '/',
			// Secure and sameSite have to be defined like so to allow cross-domain cookies
			secure: true,
			sameSite: "none",
			// https://developer.chrome.com/en/docs/privacy-sandbox/third-party-cookie-phase-out/
			partitioned: true,
			httpOnly: false,
			// Cookie expiration
			expires: new Date( Date.now() + sessionCookieLifetime * 1000 ),
			//maxAge: sessionCookieLifetime,
		})
	}

	// ---
	// Create a new session.
	server.get( base + '/auth/create/:appSlug', async ( request:FastifyRequest, reply:FastifyReply ) => {
		// Get app from slug
		const appSlug = request.params['appSlug']
		if ( !sessionService.checkRequestOriginForAppAndValidateCors( request, reply, appSlug ) )
			return
		const app = appsModel.getOneBySlug( appSlug )
		// Get session from cookie
		let session:TTableSession
		try {
			const sessionId = sessionService.getSessionIdFromRequest( request, appSlug )
			session = sessionModel.retrieveOrCreateSession( app.id, sessionId )
		}
		catch ( error ) {
			return replyJsonFromError( "session_error", reply, error );
		}
		// Special flag : "?force-recreation"
		// Will force recreation of VALIDATED session only.
		// Will keep PENDING to keep the same session cookie on each call even with the flag on.
		// This is to force user to login again when user navigates to a specific page for.
		// ex : Tenbeo website
		const forceRecreation = request.query["force-recreation"] === ""
		if ( forceRecreation && session.status === "VALIDATED" )
			session = sessionModel.createSession( app.id )
		// Push session through a cookie on this domain / refresh it
		pushSessionCookie( app.slug, session.id, reply )
		// Session has already been validated, send user
		if ( session.status === "VALIDATED" ) {
			try {
				// todo : renew session date
				return reply.send({
					session: {
						id: session.id,
						status: session.status,
					},
					user: userModel.getOneById( session.userId )
				})
			}
			catch ( error ) {
				return replyJsonFromError( "cannot_retrieve_user", reply, error );
			}
		}
		// Session has to be validated
		// Generate QR code and send data as json
		try {
			// Generate validation URL from this session
			const url = createValidationURL( session.id )
			// Optimisation : Cache QR
			const qrCodeData = await generateSessionQR( url )
			reply.send({
				session: {
					id: session.id,
					status: session.status,
				},
				login: {
					url: url,
					qr: qrCodeData,
				}
			})
		}
		catch ( error ) {
			return replyJsonFromError( "qr_generate_error", reply, error );
		}
	})

	// ------------------------------------------------------------------------- TRACK

	server.get( base + '/auth/track/:appSlug', (request:FastifyRequest, reply:FastifyReply) => {
		// Get session from request
		const appSlug = request.params['appSlug']
		if ( !sessionService.checkRequestOriginForAppAndValidateCors( request, reply, appSlug ) )
			return
		const session = sessionService.retrieveSessionFromRequest( request, appSlug )
		// Session has been found send back user
		const status = session?.status ?? "EXPIRED"
		if ( status !== "VALIDATED" )
			return reply.send({
				session: { status }
			})
		// Session has been validated, check if user subscribes to the app
		const subscribes = userModel.checkIfUserSubscribesToApp( session.userId, session.appId )
		if ( !subscribes )
			return replyJsonFromError( "user_does_not_subscribes", reply, null, 403 );
		// Send validated session, with authorized user
		return reply.send({
			session: {
				id: session.id,
				status
			},
			user: userModel.getOneById( session.userId ),
		})
	})

	// ------------------------------------------------------------------------- CHECK

	server.get( base + '/auth/verify-session/:sessionId', (request:FastifyRequest, reply:FastifyReply) => {
		// Refuse requests from browsers
		// FIXME : Is it secure ? Can't we get info for other users if we have their session ids ?
		const userAgent = request.headers['user-agent'];
		if (/mozilla|chrome|safari|firefox|edge|msie|trident/i.test(userAgent))
			return replyJsonFromError("browsers_denied", reply, null, 400 )
		// Get session from params
		const session = sessionModel.retrieveSession( request.params["sessionId"] )
		if ( !session )
			return replyJsonFromError("session_not_found", reply, null, 404 )
		// Get associated app and user
		const user = userModel.getOneById( session.userId )
		const app = appsModel.getOneById( session.appId )
		if ( !user || !app )
			return replyJsonFromError("invalid_session", reply, null, 500 )
		// Return everything and if session's user subscribes to session's app
		const subscribes = userModel.checkIfUserSubscribesToApp( session.userId, session.appId )
		reply.send({ session, app, user, subscribes })
	})

	// ------------------------------------------------------------------------- LOG OUT

	server.post( base + '/auth/logout/:appSlug', async ( request:FastifyRequest, reply:FastifyReply ) => {
		// Get session from request
		const appSlug = request.params['appSlug']
		if ( !sessionService.checkRequestOriginForAppAndValidateCors( request, reply, appSlug ) )
			return
		const session = sessionService.retrieveSessionFromRequest( request, appSlug )
		// Close session
		try {
			sessionModel.closeSession( session.id )
		}
		catch ( error ) {
			return reply.send({ status: "could_not_log_out" })
		}
		// Remove session cookie
		const cookieName = sessionService.computeSessionCookieName( appSlug )
		reply.clearCookie( cookieName ).send({ status: "success" })
	})

	// ------------------------------------------------------------------------- VALIDATE FROM TENBEO SERVER

	const validateURL = base + '/auth/validate/:sessionId'

	// This post request is called by the Tenbeo app to validate login signature
	server.post(validateURL, (request:FastifyRequest, reply:FastifyReply) => {
		// 1. --- CHECK REQUEST
		const sessionId = request.params['sessionId'] as string
		if ( typeof request.body !== "object" )
			return replyJsonFromError( "payload_parse_error", reply, null, 400 );
		const payload = request.body as IValidationPayload
		if (
			typeof payload.signature !== "string" ||
			typeof payload.message !== "string" ||
			typeof payload.public_key !== "string"
		)
			return replyJsonFromError( "payload_parse_error", reply, null, 400 );
		// 2. --- VALIDATE SIGNATURE
		let isValid:boolean
		try {
			isValid = validateSignature( payload.signature, payload.message, payload.public_key )
		}
		catch ( error ) {
			return replyJsonFromError( "unable_to_validate", reply, error, 500 );
		}
		if ( !isValid )
			return replyJsonFromError( "invalid_signature", reply, null, 403 );
		// 3. --- CHECK USER PERMISSIONS
		const user = userModel.getOneByPublicKey( payload.public_key )
		const session = sessionModel.retrieveSession( sessionId )
		if ( !session || session.status !== "PENDING" )
			return replyJsonFromError( "invalid_session", reply, null, 403 );
		if ( !user )
			return replyJsonFromError( "invalid_user", reply, null, 403 );
		// Here we check if the user from the public key, subscribes to the app from the session
		try {
			if ( !userModel.checkIfUserSubscribesToApp( user.id, session.appId ) )
				return replyJsonFromError( "user_does_not_subscribes", reply, null, 403 );
		}
		catch (error) {
			return replyJsonFromError( "unable_to_get_user_subscriptions", reply, error, 500 );
		}
		// 4. --- VALIDATE SESSION
		try {
			sessionModel.validateSession( sessionId, user.id )
		}
		catch ( error ) {
			return replyJsonFromError( "unable_to_validate_session", reply, error, 500 );
		}
		// Return success for the app
		return reply.status(200).send({ message: "Login successful" })
	})

	// This get request will redirect to tenbeo app download
	// if user scans the login QRCode with its photo app
	server.get(validateURL, (request:FastifyRequest, reply:FastifyReply) => {
		if ( !tenbeoAppURL )
			reply.status(404).send("Not found")
		else
			reply.redirect( tenbeoAppURL ).send(`Redirecting ...`)
	})
}
