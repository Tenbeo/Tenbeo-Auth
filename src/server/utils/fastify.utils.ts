import { IncomingMessage } from "node:http";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyStatic, { FastifyStaticOptions } from "@fastify/static";
import { FastifyRegisterOptions } from "fastify/types/register";

// ----------------------------------------------------------------------------- REWRITE

export type TFastifyRewriteHandler = (request:IncomingMessage) => string

let _rewriteHandlers:TFastifyRewriteHandler[] = []

export function registerFastifyRewrite ( handler:TFastifyRewriteHandler ) {
	_rewriteHandlers.push( handler )
	return () => {
		_rewriteHandlers = _rewriteHandlers.filter( h => h !== handler )
	}
}

export function getFastifyRewriteHandler ():TFastifyRewriteHandler {
	return request => {
		for ( const handler of _rewriteHandlers ) {
			const r = handler( request )
			if ( typeof r === "string" )
				return r
		}
		return request.url;
	}
}

// ----------------------------------------------------------------------------- FRONT APPS

interface IAttachFrontAppOptions {
	root			:string
	baseURI			?:string
	skipRedirect	?:( request:IncomingMessage ) => boolean
}

let _isFirst = true

export function attachFrontApp ( server:FastifyInstance, options:IAttachFrontAppOptions, fastifyOptions?:FastifyStaticOptions ) {
	options.baseURI ??= "/"
	server.register(fastifyStatic, {
		list: false,
		dotfiles: 'deny',
		...fastifyOptions,
		decorateReply: _isFirst,
		root: options.root,
		prefix: options.baseURI,
	})
	registerFastifyRewrite( request => {
		if ( options.skipRedirect && options.skipRedirect(request) )
			return
		if ( request.url.startsWith( options.baseURI ) && !request.url.includes(".") )
			return `${options.baseURI}/index.html`
	})
	_isFirst = false
}


// ----------------------------------------------------------------------------- REQUEST

/**
 * Will get request origin with fallbacks to host and referer.
 * @param request
 * @param getFullPath Will return full path with protocol and port. Otherwise will return TLD
 */
export function getRequestOriginWithFallbacks ( request:FastifyRequest, getFullPath = false ) {
	const origin = (
		request.headers.origin ? request.headers.origin
		: request.headers.host ? `${request.protocol}://${request.headers.host}`
		: request.headers.referer
	)
	return (
		getFullPath ? origin
		: (origin.split("://")[1] ?? "").split("/")[0].split(":")[0]
	)
}

// ----------------------------------------------------------------------------- CORS

interface IAddCorsHeadersOptions {
	reply				:FastifyReply
	allowedOrigin		?:string
	request				:FastifyRequest
	allowCredentials	?:boolean
	methods				?:string[]
}

export function injectCorsHeaders ( options:IAddCorsHeadersOptions ) {
	// Always allow pre-flight request
	// Stop there, there is no need to not continue the API implementation
	// So the parent function should listen for false returns and quit
	if ( options.request.method === "OPTIONS" ) {
		options.reply.status(200).send();
		return false
	}
	// Default allowed methods
	options.methods ??= ["GET", "POST", "PATCH", "DELETE", "OPTION"]
	// Grab origin from options or automatically
	const origin = options.allowedOrigin ?? getRequestOriginWithFallbacks( options.request, true )
	options.reply.header('Access-Control-Allow-Origin', origin);
	// Allow credentials ( for cookies / auth )
	if ( options.allowCredentials !== false )
		options.reply.header('Access-Control-Allow-Credentials', 'true');
	// Send CORS headers
	options.reply.header('Access-Control-Allow-Methods', options.methods.join(", "));
	options.reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, *');
	return true
}

