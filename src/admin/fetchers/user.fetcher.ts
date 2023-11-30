import { createFetcher } from "@zouloux/fetcher"
import type { IUserWithSubscribedApps, TTableUsers } from "../../server/db/schema.db"
import { jsonBodyBuilder } from "../utils/fetcher.utils";

const apiBase = process.env.TENBEO_AUTH_CLIENT_API_BASE

export const userFetchers = {
	list: createFetcher<[], IUserWithSubscribedApps[]>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request ) => {
			request.credentials = "include"
			return `/users/`
		},
	}),
	get: createFetcher<[number|"new"], IUserWithSubscribedApps>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/users/${fetcherArguments[0]}`
		},
	}),
	create: createFetcher<[Omit<TTableUsers, "id" | "creationDate">], null>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request ) => {
			request.credentials = "include"
			return `/users/create`
		},
		buildBody: jsonBodyBuilder( args => args[0], "POST" )
	}),
	update: createFetcher<[number, TTableUsers], null>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/users/${fetcherArguments[0]}`
		},
		buildBody: jsonBodyBuilder( args => args[1], "PATCH" )
	}),
	delete: createFetcher<[number], null>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/users/${fetcherArguments[0]}`
		},
		buildBody: jsonBodyBuilder( null, "DELETE" )
	}),
}