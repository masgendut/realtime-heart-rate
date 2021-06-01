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
import dotenv from 'dotenv';
import Database from '../src/helpers/database';
import DateTime from '../src/helpers/datetime';
import UUID from '../src/helpers/uuid';
import IClientModel from '../src/models/IClientModel';

dotenv.config();

const clientNameList = ['Web Front-End', 'Emitter/Tester'];
const webClientIdentifierFileLocation: fs.PathLike = path.join(
	__dirname,
	'..',
	'public',
	'static',
	'js',
	'clientIdentifier.js'
);
const webAppVersionFileLocation: fs.PathLike = path.join(__dirname, '..', 'public', 'static', 'js', 'appVersion.js');
const clientsFileLocation: fs.PathLike = path.join(__dirname, '..', 'clients.json');

const pkgFilePath = path.join(__dirname, '..', 'package.json');
const pkgFileContent = fs.readFileSync(pkgFilePath, { encoding: 'utf-8' });
const pkg = JSON.parse(pkgFileContent);
const appVersion = pkg.version;
const versionListContent = 'const VERSION_LIST = [ "1.0.0", "2.0.0" ];';

export async function migrateUp() {
	const { client, session, collections } = await Database.getSessionPackage();
	try {
		await session.startTransaction();
		const frontEndClients: IClientModel[] = [];
		for (const clientName of clientNameList) {
			let frontEndClient: IClientModel = {
				_id: UUID.generate(),
				name: clientName,
				created_at: DateTime.formatDate(),
			};
			frontEndClient = UUID.transformIdentifierToShort(frontEndClient);
			const addResult = await collections.clients.add(frontEndClient).execute();
			if (addResult.getWarningsCount() > 0) {
				for (const warning of addResult.getWarnings()) {
					console.log('WARNING: ' + warning.msg + ' [' + warning.code + '][' + warning.level + ']');
				}
			}
			frontEndClient = <IClientModel>await collections.clients.getOne(<string>frontEndClient._id);
			frontEndClients.push(UUID.transformIdentifierToRegular(frontEndClient));
			console.log('Created Client "' + clientName + '" with ID ' + frontEndClient._id);
		}
		await collections.sessions.remove().execute();
		const webClientIdentifierFileContent: string = `const CLIENT_IDENTIFIER = '${frontEndClients[0]._id}';`;
		const webAppVersionFileContent: string = `const APP_VERSION = '${appVersion}';${versionListContent}`;
		fs.writeFileSync(webClientIdentifierFileLocation, webClientIdentifierFileContent, { encoding: 'utf-8' });
		fs.writeFileSync(webAppVersionFileLocation, webAppVersionFileContent, { encoding: 'utf-8' });
		fs.writeFileSync(clientsFileLocation, JSON.stringify({ clients: frontEndClients }, null, 4), {
			encoding: 'utf-8',
		});
		await session.commit();
		console.log('Successfully migrate application data.');
	} catch (error) {
		await session.rollback();
		console.error(error);
	} finally {
		await client.close();
	}
}

export async function migrateDown() {
	const { client, session, collections } = await Database.getSessionPackage();
	try {
		await session.startTransaction();
		const deleteResult = await collections.clients.remove().execute();
		if (deleteResult.getWarningsCount() > 0) {
			for (const warning of deleteResult.getWarnings()) {
				console.log('WARNING: ' + warning.msg + ' [' + warning.code + '][' + warning.level + ']');
			}
		}
		await collections.sessions.remove().execute();
		fs.unlinkSync(webClientIdentifierFileLocation);
		fs.unlinkSync(webAppVersionFileLocation);
		fs.unlinkSync(clientsFileLocation);
		await session.commit();
		console.log('Successfully unmigrate application data.');
	} catch (error) {
		await session.rollback();
		console.error(error);
	} finally {
		await client.close();
	}
}
