import Database from 'better-sqlite3';
import path from "path";
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "./schema.db"

type DrizzleSchema = ReturnType<typeof createDrizzle>

let _currentDrizzle:DrizzleSchema

const createDrizzle = ( database ) => drizzle( database, { schema } )

export function dbGetFilePath ( fileName = "auth.db" ) {
	return path.join( process.env.TENBEO_AUTH_DATA_DIRECTORY, fileName )
}

export function dbGet ():DrizzleSchema {
	if ( !_currentDrizzle ) {
		const dbFile = dbGetFilePath()
		const sqlite = new Database( dbFile );
		_currentDrizzle = createDrizzle( sqlite )
	}
	return _currentDrizzle
}
