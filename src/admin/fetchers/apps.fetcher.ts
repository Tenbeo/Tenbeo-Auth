import { createFetcher } from "@zouloux/fetcher";
import { IAppForList, TTableApps } from "../../server/db/schema.db";
import { jsonBodyBuilder } from "../utils/fetcher.utils";

const apiBase = process.env.TENBEO_AUTH_CLIENT_API_BASE

export const appsFetchers = {
	list: createFetcher<[], IAppForList[]>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request ) => {
			request.credentials = "include"
			return `/apps/`
		}
	}),
	get: createFetcher<[number], TTableApps>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/apps/${fetcherArguments[0]}`
		}
	}),
	create: createFetcher<[Omit<TTableApps, "id" | "creationDate">], null>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request ) => {
			request.credentials = "include"
			return `/apps/create`
		},
		buildBody: jsonBodyBuilder( args => args[0], "POST" )
	}),
	update: createFetcher<[number, TTableApps], null>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/apps/${fetcherArguments[0]}`
		},
		buildBody: jsonBodyBuilder( args => args[1], "PATCH" )
	}),
	delete: createFetcher<[number], null>({
		base: apiBase,
		responseType: "json",
		buildURI: ( request, fetcherArguments ) => {
			request.credentials = "include"
			return `/apps/${fetcherArguments[0]}`
		},
		buildBody: jsonBodyBuilder( null, "DELETE" )
	}),
}