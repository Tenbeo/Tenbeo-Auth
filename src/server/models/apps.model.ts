import { dbGet } from "../db/connect.db";
import { IAppForList, junctionAppsUsers, tableApps, tableUsers, TTableApps, TTableUsers } from "../db/schema.db";
import { eq, sql } from "drizzle-orm";

export const appsModel = {
	getAll ():TTableApps[] {
		return dbGet()
			.select().from( tableApps )
			.all()
	},

	getAllWithUserCount ():IAppForList[] {
		return appsModel.getAll().map( (app:IAppForList) => ({
			...app,
			totalUsers: appsModel.countUsersOfAppId( app.id )
		}))
	},

	getOneById ( appId:number ):TTableApps {
		return dbGet()
			.select().from( tableApps )
			.where(eq(tableApps.id, appId))
			.get()
	},

	getOneBySlug ( slug:string ):TTableApps {
		return dbGet()
			.select().from( tableApps )
			.where(eq(tableApps.slug, slug))
			.get()
	},

	getUsersOfAppId ( appId:number ):TTableUsers[] {
		return dbGet()
			.select()
			.from( junctionAppsUsers )
			.leftJoin(tableUsers, () => eq(junctionAppsUsers.userId, tableUsers.id))
			.leftJoin(tableApps, () => eq(junctionAppsUsers.appId, tableApps.id))
			.where(eq(tableApps.id, appId))
			.all()
			.map( j => j.users )
	},

	countUsersOfAppId ( appId:number ):number {
		return dbGet()
			.select({
				count: sql<number>`count(${junctionAppsUsers.userId})`,
			})
			.from( junctionAppsUsers )
			.where(eq(junctionAppsUsers.appId, appId))
			.get().count
	},

	create ( app:Omit<TTableApps, "id" | "creationDate"> ) {
		// Forbid Id
		delete app['id']
		return dbGet()
			.insert( tableApps )
			.values({
				...app,
				creationDate: new Date(),
			})
			.returning({ insertedId: tableApps.id })
			.get().insertedId
	},

	update ( app:TTableApps ) {
		// Extract id from app to forbid ID mutations
		const { id } = app
		delete app.id
		// Forbid creation date mutations
		delete app.creationDate
		return dbGet()
			.update( tableApps )
			.set( app )
			.where(eq(tableApps.id, id))
			.returning({ updatedId: tableApps.id })
			.get().updatedId
	},

	delete ( appId:number ) {
		return dbGet()
			.delete( tableApps )
			.where(eq(tableApps.id, appId))
			.returning({ deletedId: tableApps.id })
			.get().deletedId;
	},
}