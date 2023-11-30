import { createFetcher } from "@zouloux/fetcher"
import { jsonBodyBuilder } from "../utils/fetcher.utils";
import { TTableSession, TTableUsers } from "../../server/db/schema.db";

const apiBase = process.env.TENBEO_AUTH_CLIENT_API_BASE

interface IAuthCreateResponse {
	session ?: {
		id					:string
		status				:TTableSession['status']
	}
	login ?: {
		url					:string
		qr					:string
	}
	user ?: TTableUsers
}

export interface IAuthTrackResponse {
	session		?: {
		id			:string
		status		: TTableSession['status']
	}
	user			?:TTableUsers
}

export const authFetchers = {
	// Force create a new session, even if a valid session exists
	create: createFetcher<[string], IAuthCreateResponse>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/auth/create/${ fetcherArguments[0] }`
		},
	}),
	// Track a session id status
	track: createFetcher<[string], IAuthTrackResponse>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/auth/track/${fetcherArguments[0]}`
		},
	}),
	// Log out and destroy current session
	logout: createFetcher<[string], {}>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/auth/logout/${fetcherArguments[0]}`
		},
		buildBody: jsonBodyBuilder( null, "POST" )
	}),
}