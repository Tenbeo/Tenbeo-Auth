import { dbGet } from "../db/connect.db";
import { IAppsSubscriptions, IAppSubscriptionTiny, IUserWithSubscribedApps, junctionAppsUsers, tableUsers, TTableUsers } from "../db/schema.db";
import { and, eq } from "drizzle-orm";
import { appsModel } from "./apps.model";
import { tenbeoAdminSlug } from "../server";

export const userModel = {

	// ------------------------------------------------------------------------- USER CRUD

	// --- GET ALL
	getAll ():TTableUsers[] {
		return dbGet()
			.select().from( tableUsers )
			.all()
	},
	getAllUsersWithTheirAppSubscription ():IUserWithSubscribedApps[] {
		return userModel.getAll().map( (user:IUserWithSubscribedApps) => ({
			...user,
			appsSubscriptions: userModel.getUserAppSubscriptions( user.id, true )
		}))
	},

	// --- GET ONE
	getOneById ( userId:number ):TTableUsers {
		return dbGet()
			.select().from( tableUsers )
			.where(eq(tableUsers.id, userId))
			.get()
	},
	getOneByPublicKey ( publicKey:string ) {
		return dbGet()
		.select().from( tableUsers )
		.where(eq(tableUsers.publicKey, publicKey))
		.get()
	},

	// --- CREATE
	create ( user:Omit<TTableUsers, "id" | "creationDate"> ) {
		// Forbid Id
		delete user['id']
		return dbGet()
			.insert( tableUsers )
			.values({
				...user,
				creationDate: new Date(),
			})
			.returning({ insertedId: tableUsers.id })
			.get().insertedId
	},
	createAdminUser ( name:string, publicKey:string ):number {
		let createdUserId = userModel.create({ name, publicKey, data: "", email: "" })
		const adminApp = appsModel.getOneBySlug( tenbeoAdminSlug )
		userModel.setUserAppSubscriptions( createdUserId, [{
			id: adminApp.id,
			subscribes: true,
		}])
		return createdUserId
	},

	// --- UPDATE
	update ( user:TTableUsers ) {
		// Extract id from user to forbid ID mutations
		const { id } = user
		delete user.id
		// Forbid creation date mutations
		delete user.creationDate

		return dbGet()
			.update( tableUsers )
			.set( user )
			.where(eq(tableUsers.id, id))
			.returning({ updatedId: tableUsers.id })
			.get().updatedId
	},

	// --- DELETE
	delete ( userId:number ) {
		return dbGet()
			.delete( tableUsers )
			.where(eq(tableUsers.id, userId))
			.returning({ deletedId: tableUsers.id })
			.get().deletedId;
	},

	// ------------------------------------------------------------------------- APP SUBSCRIPTION

	getUserAppSubscriptions ( userId:number, returnOnlySubscribed = false ):IAppsSubscriptions[] {
		// Get apps subscription ids for this user
		const appsForUser = dbGet()
			.select().from( junctionAppsUsers )
			.where(eq(junctionAppsUsers.userId, userId))
			.all()
		// Will return all apps, and have a "subscribes" flag on each
		const allApps = appsModel.getAll()
		const allAppSubscriptionsForUser = allApps.map( app => ({
			...app,
			subscribes: !!appsForUser.find(
				appForUser => appForUser.appId === app.id
			)
		}))
		return (
			returnOnlySubscribed
			? allAppSubscriptionsForUser.filter( appSubscription => appSubscription.subscribes )
			: allAppSubscriptionsForUser
		)
	},

	setUserAppSubscriptions ( userId:number, appSubscriptions:IAppSubscriptionTiny[] ) {
		appSubscriptions.forEach( subscription => {
			// Insert app subscription
			subscription.subscribes
			? dbGet()
				.insert( junctionAppsUsers )
				.values({ userId, appId: subscription.id, })
				.onConflictDoNothing()
				.run()
			// Delete app subscription
			: dbGet()
				.delete( junctionAppsUsers )
				.where( and(
					eq( junctionAppsUsers.userId, userId ),
					eq( junctionAppsUsers.appId, subscription.id ),
				))
				.run()
		})
	},

	checkIfUserSubscribesToApp ( userId:number, appId:number ) {
		return !!userModel
			.getUserAppSubscriptions( userId, true )
			.find( sub => sub.id === appId )
	},
}