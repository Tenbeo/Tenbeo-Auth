import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel, Table } from "drizzle-orm";

// ----------------------------------------------------------------------------- TYPE HELPER

export type TAutoInferFromDrizzle <T extends Table> = InferSelectModel<T> & InferInsertModel<T>;

// ----------------------------------------------------------------------------- APPS

export const tableApps = sqliteTable("apps", {
	id				: integer("id").notNull().primaryKey({ autoIncrement: true }),
	creationDate	: integer("creation_date", { mode: "timestamp" }).notNull(),
	slug			: text("slug").notNull().unique("slug"),
	allowedHosts	: text("allowed_hosts", { mode: "json" }),
})
export const tableAppsRelations = relations(tableApps, ({many}) => ({
	users: many(tableUsers)
}))
export type TTableApps = TAutoInferFromDrizzle<typeof tableApps>

// ----------------------------------------------------------------------------- USERS

export const tableUsers = sqliteTable("users", {
	id				: integer("id").notNull().primaryKey({ autoIncrement: true }),
	creationDate	: integer("creation_date", { mode: "timestamp" }).notNull(),
	publicKey		: text("public_key").notNull().unique("public_key"),
	name			: text("name").notNull(),
	email			: text("email"),
	data			: text("data"),
})
export const tableUsersRelations = relations(tableUsers, ({many}) => ({
	apps: many(tableApps)
}))
export type TTableUsers = TAutoInferFromDrizzle<typeof tableUsers>

// ----------------------------------------------------------------------------- APPS <=> USERS
// Create many-to-many relation between apps and users tables

export const junctionAppsUsers = sqliteTable(
	"junction_apps_users", {
		userId: integer("user_id")
			.notNull()
			.references(() => tableUsers.id, { onDelete: "cascade" }),
		appId: integer("app_id")
			.notNull()
			.references(() => tableApps.id, { onDelete: "cascade" }),
	},
	t => ({ pk: primaryKey(t.userId, t.appId) })
)
export const junctionAppsUsersRelations = relations(junctionAppsUsers, ({ one }) => ({
	user: one(tableUsers, {
		fields: [ junctionAppsUsers.userId ],
		references: [ tableUsers.id ],
	}),
	app: one(tableApps, {
		fields: [ junctionAppsUsers.appId ],
		references: [ tableApps.id ],
	}),
}))

// ----------------------------------------------------------------------------- APP SUBSCRIPTIONS

// Apps but with a flag which indicates if relative user subscribes to this apps
export interface IAppsSubscriptions extends TTableApps {
	subscribes:boolean
}

export type IAppSubscriptionTiny = Partial<Pick<IAppsSubscriptions, "id" | "subscribes" | "slug">>

export interface IUserWithSubscribedApps extends TTableUsers {
	appsSubscriptions:IAppSubscriptionTiny[]
}

// How many users subscribed to an app and if app is locked
export interface IAppForList extends TTableApps {
	totalUsers:number
	locked: boolean
}


// ----------------------------------------------------------------------------- SESSIONS

export const tableSessions = sqliteTable("sessions", {
	id				: text("id", { length: 32 }).notNull().primaryKey(),
	creationDate	: integer("creation_date", { mode: "timestamp" }).notNull(),
	lastUsageDate	: integer("last_usage_date", { mode: "timestamp" }).notNull(),
	appId			: integer("app_id").notNull().references(() => tableApps.id, { onDelete: "cascade" }),
	userId			: integer("user_id").references(() => tableUsers.id, { onDelete: "cascade" }),
	status			: text("status", {
		mode: "text",
		enum: ["PENDING", "VALIDATED", "EXPIRED"]
	}).notNull(),
})

export const tableSessionsRelations = relations(tableSessions, ({one}) => ({
	app: one(tableApps),
	user: one(tableUsers),
}))
export type TTableSession = TAutoInferFromDrizzle<typeof tableSessions>
