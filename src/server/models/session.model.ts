import { dbGet } from "../db/connect.db";
import { tableSessions, TTableSession } from "../db/schema.db";
import { and, eq, lt } from "drizzle-orm";
import { createUniqueID } from "../utils/crypto.utils";

export const sessionModel = {

	retrieveSession ( sessionId?:string ):TTableSession {
		if ( !sessionId )
			return null
		return dbGet()
			.select().from( tableSessions )
			.where(eq( tableSessions.id, sessionId ))
			.get()
	},

	createSession ( appId:number ):TTableSession {
		// Find a new session which is not already existing in database
		// Should never loop, but we have to make sure that session IDs are truly random
		let sessionId:string
		do { sessionId = createUniqueID(32) }
		while ( this.retrieveSession( sessionId ) )
		// Insert in db and return full object
		return dbGet()
			.insert( tableSessions )
			.values({
				id: sessionId,
				appId,
				status: "PENDING",
				creationDate: new Date(),
				lastUsageDate: new Date(),
			})
			.returning().get()
	},

	retrieveOrCreateSession ( appId:number, sessionId?:string ) {
		let session = this.retrieveSession( sessionId )
		if ( session?.status === "EXPIRED" )
			session = null
		return session ?? this.createSession( appId )
	},

	validateSession ( sessionId:string, userId:number ) {
		const session = this.retrieveSession( sessionId )
		if ( !session )
			throw new Error(`Session ${sessionId} does not exists`)
		if ( session.status !== "PENDING" && session.status !== "VALIDATED" )
			throw new Error(`Cannot validate session ${sessionId}. Invalid status ${session.status}.`)
		try {
			dbGet().update( tableSessions )
				.set({
					status: "VALIDATED",
					lastUsageDate: new Date(),
					userId
				})
				.where(eq( tableSessions.id, sessionId ))
				.returning().get()
		}
		catch ( error ) {
			throw new Error(`Unable to validate session ${sessionId}`)
		}
	},

	closeSession ( sessionId:string ) {
		try {
			dbGet().update( tableSessions )
				.set({ status: "EXPIRED" })
				.where( eq( tableSessions.id, sessionId ) )
				.returning().get()
		}
		catch ( error ) {
			throw new Error(`Unable to validate session ${sessionId}`)
		}
	},

	// Reset lastUsageDate to current date
	// NOTE : Will not check session existence or status !
	refreshSession ( sessionId:string ) {
		dbGet().update( tableSessions )
			.set({
				lastUsageDate: new Date()
			})
			.where(eq( tableSessions.id, sessionId ))
			.returning().get()
	},

	getExpiredSessions ( status:TTableSession["status"] ):TTableSession[] {
		// Compute expiration date
		let lifeTimeVar:string
		if ( status === "VALIDATED" )
			lifeTimeVar = process.env.TENBEO_AUTH_SESSION_VALIDATED_LIFE_TIME
		else if ( status === "PENDING" )
			lifeTimeVar = process.env.TENBEO_AUTH_SESSION_PENDING_LIFE_TIME
		else if ( status === "EXPIRED" )
			lifeTimeVar = process.env.TENBEO_AUTH_SESSION_EXPIRED_LIFE_TIME
		else
			throw new Error("SessionModel.getAllPendingSessions // Invalid type")
		const lifeTimeValue = parseFloat( lifeTimeVar ) ?? 3600
		// No expiration date
		if ( lifeTimeValue == 0 )
			return []
		const expirationDate = new Date( Date.now() )
		expirationDate.setUTCSeconds( expirationDate.getUTCSeconds() - lifeTimeValue)
		// Get all pending
		return dbGet()
			.select()
			.from( tableSessions )
			.where( and(
				eq(tableSessions.status, status),
				lt(tableSessions.lastUsageDate, expirationDate)
			))
			.all() ?? []
	},

	changeSessionType ( sessionId:string, status:TTableSession["status"] ) {
		return dbGet().update( tableSessions )
			.set({ status })
			.where( eq( tableSessions.id, sessionId ) )
			.returning().get()
	},

	removeSession ( sessionId:string ) {
		return dbGet().delete( tableSessions )
			.where( eq( tableSessions.id, sessionId ) )
			.returning().get()
	},
}