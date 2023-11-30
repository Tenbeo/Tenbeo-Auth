import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export function replyJsonFromError ( code:string, reply:FastifyReply, error?:Error, httpStatus = 500 ) {
	let message = { code }
	if ( error )
		// @ts-ignore
		message.error = {
			name: error.name,
			message: error.message,
		}
	console.error( message )
	reply.status( httpStatus ).send( message )
}

export function checkJSONValidity ( data, reply:FastifyReply ):boolean {
	if ( !data )
		return true
	try {
		JSON.parse(data)
		return true
	}
	catch (error) {
		return false
	}
}

export function catchAllRequestsBeyondEndpoint ( server:FastifyInstance, base:string, handler:( request:FastifyRequest, reply:FastifyReply) => any ) {
	server.addHook("onRequest", (request, reply, done) => {
		if ( !request.url.startsWith(base) )
			return done();
		const r = handler( request, reply )
		if ( r instanceof Promise )
			r.then( done )
		else
			done();
	})
}
