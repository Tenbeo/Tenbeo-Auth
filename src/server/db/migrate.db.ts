import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { dbGet, dbGetFilePath } from "./connect.db";
import { copyFileSync, existsSync } from "fs"

export function dbMigrate () {
	// Copy database backup before migration
	const filePath = dbGetFilePath()
	if ( existsSync(filePath) )
		copyFileSync(filePath, filePath+".backup" )
	// Do migration
	const db = dbGet()
	migrate(db, {
		migrationsFolder: process.env.TENBEO_AUTH_MIGRATION_DIRECTORY,
	});
}
