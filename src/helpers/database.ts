/**
 * Copyright 2019, Danang Galuh Tegar Prasetyo & Mokhamad Mustaqim.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import DatabaseConfig from '../config/database.config';
import Client from '../database/Client';
import Session from '../database/Session';
import Schema from '../database/Schema';
import Collection from '../database/Collection';

class Database {

	private readonly collectionNameList: string[];

	constructor() {
		this.collectionNameList = [
			'clients', 'devices', 'pulses', 'pulse_arrivals', 'sessions'
		];
	}

    public async prepareDatabase(): Promise<DatabaseSessionPackage> {
    	try {
			const client = new Client(DatabaseConfig.connectionOptions, DatabaseConfig.poolingOptions);
    		const schemaName: string = (DatabaseConfig.connectionOptions as any).schema;
    		const session: Session = await client.getSession();
    		let schema: Schema = session.getSchema(schemaName);
    		if (!(await schema.existsInDatabase())) {
    			schema = await session.createSchema(schemaName);
			}
    		const collections: {} = {};
    		for (const collectionName of this.collectionNameList) {
    			let collection: Collection = await schema.getCollection(collectionName);
    			if (!(await collection.existsInDatabase())) {
					collection = await schema.createCollection(collectionName);
    			}
    			collections[collectionName] = collection;
			}
			return {
    			client, session, schema,
				collections: <Record<CollectionName, Collection>>collections
    		};
		} catch (error) {
    		throw error;
		}
	}

}

type CollectionName = 'clients' | 'devices' | 'pulses' | 'pulse_arrivals' | 'sessions';

type DatabaseSessionPackage = {
	client: Client
	session: Session
	schema: Schema
	collections: Record<CollectionName, Collection>
}

const database = new Database();
export default database;
