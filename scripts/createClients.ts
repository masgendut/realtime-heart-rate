import DatabaseHelpers from '../src/helpers/database';
import IClientModel from '../src/models/IClientModel';
import UUID from '../src/helpers/uuid';
import DateTime from '../src/helpers/datetime';
import fs from "fs";
import path from "path";

const clientNameList = [
	'Web Front-End',
	'Emitter/Tester'
];
const webClientIdentifierFileLocation: fs.PathLike
	= path.join(__dirname, '..', 'public', 'static', 'js', 'clientIdentifier.js');
const clientsFileLocation: fs.PathLike = path.join(__dirname, '..', 'clients.json');

async function createClients() {
	const { client, session, collections } = await DatabaseHelpers.prepareDatabase();
	try {
		await session.startTransaction();
		const frontEndClients: IClientModel[] = [];
		for (const clientName of clientNameList) {
			let frontEndClient: IClientModel = {
				_id: UUID.generate(),
				name: clientName,
				created_at: DateTime.formatDate(new Date())
			};
			frontEndClient = UUID.transformIdentifierToShort(frontEndClient);
			const addResult = await collections.clients
				.add(frontEndClient)
				.execute();
			if (addResult.getWarningsCount() > 0) {
				for (const warning of addResult.getWarnings()) {
					console.log('WARNING: ' + warning.msg + ' [' + warning.code + '][' + warning.level + ']');
				}
			}
			frontEndClient = await collections.clients
				.getOne(<string>frontEndClient._id);
			frontEndClients.push(UUID.transformIdentifierToRegular(frontEndClient));
			console.log('Created Client "' + clientName + '" with ID ' + frontEndClient._id);
		}
		await collections.sessions.remove().execute();
		const webClientIdentifierFileContent: string
			= `const CLIENT_IDENTIFIER = '${ frontEndClients[0]._id }';`;
		fs.writeFileSync(
			webClientIdentifierFileLocation,
			webClientIdentifierFileContent,
			{ encoding: 'utf-8' });
		fs.writeFileSync(
			clientsFileLocation,
			JSON.stringify({ clients: frontEndClients }, null, 4),
			{ encoding: 'utf-8' }
		);
		await session.commit();
	} catch (error) {
		await session.rollback();
		console.error(error);
	} finally {
		await client.close();
	}
}

createClients().then(() => {
	process.exit(0);
});
