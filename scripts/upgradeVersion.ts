/**
 * Copyright 2019, Mokhamad Mustaqim & Danang Galuh Tegar Prasetyo.
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

import fs from 'fs';
import path from 'path';
import mysqlx, { Client, Collection, Schema, Session, Table } from 'mysqlx';
import DatabaseConfig from '../src/config/database.config';
import UUID from '../src/helpers/uuid';
import IPulseModel from '../src/models/IPulseModel';
import IDeviceModel from '../src/models/IDeviceModel';

const pkgFilePath = path.join(__dirname, '..', 'package.json');
const pkgFileContent = fs.readFileSync(pkgFilePath, { encoding: 'utf-8' });
const pkg = JSON.parse(pkgFileContent);
const APP_IDENTIFIER: string = pkg.name;
const EXPECTED_VERSION: string = pkg.version;
const SCHEMA_NAME: string = (DatabaseConfig.connectionOptions as any).schema;
const VERSION_LIST = ['1.0.0', '2.0.0'];
let CURRENT_VERSION = VERSION_LIST[0];

export async function upgradeVersion() {
	if (VERSION_LIST[VERSION_LIST.length - 1] !== EXPECTED_VERSION) {
		console.log(
			'Cannot upgrade. Expected application version ' + EXPECTED_VERSION + ' is not available in Version List'
		);
		return;
	}
	const client: Client = mysqlx.getClient(DatabaseConfig.connectionOptions, DatabaseConfig.poolingOptions);
	let session: Session | undefined;
	try {
		session = await client.getSession();
		// Get schema, if not exists, that means no upgrade required
		let schema: Schema = session.getSchema(SCHEMA_NAME);
		const isSchemaExists = await schema.existsInDatabase();
		if (!isSchemaExists) {
			// Not exists, means expected version
			CURRENT_VERSION = EXPECTED_VERSION;
			schema = await session.createSchema(SCHEMA_NAME);
		}
		// Get application collection
		let appsCollection: Collection = schema.getCollection('applications');
		const isAppsCollectionExists = await appsCollection.existsInDatabase();
		if (isSchemaExists && !isAppsCollectionExists) {
			// Not exists, means old version
			CURRENT_VERSION = VERSION_LIST[0];
			appsCollection = await schema.createCollection('applications');
		}
		// Get application information
		let appInfo: ApplicationModel = <ApplicationModel>await appsCollection.findByID(APP_IDENTIFIER);
		// If appInfo not found, means old version; Else get current version
		CURRENT_VERSION = !appInfo ? VERSION_LIST[0] : appInfo.version;
		if (CURRENT_VERSION !== EXPECTED_VERSION) {
			// Start transaction
			if (!(await session.startTransaction())) {
				throw new Error('Failed to start MySQL transaction.');
			}
			await doUpgrade(session, schema);
			if (!(await session.commit())) {
				throw new Error('Failed to commit MySQL transaction.');
			}
			console.log();
			console.log('Application has been successfully upgraded.');
		} else {
			console.log('Application already in the latest version.');
		}
		console.log('Current Version         : ' + CURRENT_VERSION);
		console.log('Expected Latest Version : ' + EXPECTED_VERSION);
	} catch (error) {
		if (session) {
			await session.rollback();
		}
		console.error(error);
	} finally {
		await client.close();
	}
}

async function doUpgrade(session: Session, schema: Schema) {
	try {
		const upgradeList: string[] = [];
		let upgrade = false;
		for (const version of VERSION_LIST) {
			if (upgrade) {
				upgradeList.push(version);
			}
			if (version === CURRENT_VERSION) {
				upgrade = true;
			}
			if (version === EXPECTED_VERSION) {
				upgrade = false;
			}
		}
		for (const targetVersion of upgradeList) {
			switch (targetVersion) {
				case VERSION_LIST[0]:
					// Are you kidding?
					// You're trying to upgrade to the first version.
					break;
				case VERSION_LIST[1]:
					await upgradeToVersion2(session, schema);
					break;
			}
			console.log('INFO: Successfully upgraded application to version ' + targetVersion + '.');
		}
	} catch (error) {
		throw error;
	}
}

async function writeAppInfo(schema: Schema, version: string) {
	try {
		const appInfo: ApplicationModel = {
			_id: APP_IDENTIFIER,
			name: 'Real-Time Heart Rate',
			version: version,
		};
		const appsCollection: Collection = schema.getCollection('applications');
		const finalResult = await appsCollection.add(appInfo).execute();
		if (finalResult.getWarningsCount() > 0) {
			for (const warning of finalResult.getWarnings()) {
				console.error(warning.level + ' [' + warning.code + '] ' + warning.msg);
			}
			throw new Error('Failed to write new app info.');
		}
	} catch (error) {
		throw error;
	}
}

async function upgradeToVersion2(session: Session, schema: Schema) {
	const targetVersion = VERSION_LIST[1];
	try {
		// Define variables
		const devicesTable = schema.getTable('devices');
		const pulsesTable = schema.getTable('pulses');
		const oldDevices: OldDeviceModel[] = [];
		const oldPulses: OldPulseModel[] = [];
		const devices: IDeviceModel[] = [];
		const pulses: IPulseModel[] = [];
		// Read existing data
		if (await devicesTable.existsInDatabase()) {
			const result = await devicesTable.select().execute();
			for (const device of result.getObjects()) {
				oldDevices.push(<OldDeviceModel>device);
			}
		}
		if (await pulsesTable.existsInDatabase()) {
			const result = await pulsesTable.select().execute();
			for (const pulse of result.getObjects()) {
				oldPulses.push(<OldPulseModel>pulse);
			}
		}
		// Create new formatted data
		for (const oldDevice of oldDevices) {
			const device: IDeviceModel = {
				_id: UUID.generate(),
				old_id: oldDevice.id,
				name: oldDevice.name,
				created_at: oldDevice.created_at,
			};
			devices.push(UUID.transformIdentifierToShort(device));
		}
		for (const oldPulse of oldPulses) {
			const device = devices.find((d) => d.old_id === <number>(<unknown>oldPulse.device_id));
			if (device) {
				const pulse: IPulseModel = {
					_id: UUID.generate(),
					old_id: oldPulse.id,
					device_id: device._id,
					pulse: oldPulse.pulse,
					emitted_at: oldPulse.emitted_at,
					created_at: oldPulse.created_at,
				};
				pulses.push(UUID.transformIdentifierToShort(pulse));
			}
		}
		// Remove existing data
		await session.sql('DROP TABLE `' + SCHEMA_NAME + '`.`pulses`').execute();
		await session.sql('DROP TABLE `' + SCHEMA_NAME + '`.`devices`').execute();
		// Writing new formatted data
		const devicesCollection = await schema.createCollection('devices');
		const pulsesCollection = await schema.createCollection('pulses');
		for (const device of devices) {
			const deviceAddResult = await devicesCollection.add(device).execute();
			if (deviceAddResult.getWarningsCount() > 0) {
				for (const warning of deviceAddResult.getWarnings()) {
					console.error(warning.level + ' [' + warning.code + '] ' + warning.msg);
				}
				throw new Error('Device add failed at _id ' + device._id + ' / old_id ' + device.old_id);
			}
		}
		for (const pulse of pulses) {
			const pulseAddResult = await pulsesCollection.add(pulse).execute();
			if (pulseAddResult.getWarningsCount() > 0) {
				for (const warning of pulseAddResult.getWarnings()) {
					console.error(warning.level + ' [' + warning.code + '] ' + warning.msg);
				}
				throw new Error('Pulse add failed at _id ' + pulse._id + ' / old_id ' + pulse.old_id);
			}
		}
		// Write new app info
		await writeAppInfo(schema, targetVersion);
	} catch (error) {
		throw error;
	}
}

type ApplicationModel = {
	_id: string;
	name: string;
	version: string;
};

type OldDeviceModel = {
	id?: number;
	name: string;
	created_at: Date | number;
};

type OldPulseModel = {
	id?: number;
	device_id: string;
	pulse: number;
	emitted_at: Date | number;
	created_at: Date | number;
};
