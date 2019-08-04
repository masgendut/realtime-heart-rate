import DatabaseHelpers from '../src/helpers/database';
import fs from "fs";
import path from "path";

const webClientIdentifierFileLocation: fs.PathLike
	= path.join(__dirname, '..', 'public', 'static', 'js', 'clientIdentifier.js');
const clientsFileLocation: fs.PathLike = path.join(__dirname, '..', 'clients.json');

async function dropClients() {
	const { client, session, collections } = await DatabaseHelpers.prepareDatabase();
	try {
		await session.startTransaction();
		const deleteResult = await collections.clients
			.remove()
			.execute();
		if (deleteResult.getWarningsCount() > 0) {
			for (const warning of deleteResult.getWarnings()) {
				console.log('WARNING: ' + warning.msg + ' [' + warning.code + '][' + warning.level + ']');
			}
		}
		await collections.sessions.remove().execute();
		fs.unlinkSync(webClientIdentifierFileLocation);
		fs.unlinkSync(clientsFileLocation);
		await session.commit();
	} catch (error) {
		await session.rollback();
		console.error(error);
	} finally {
		await client.close();
	}
}

dropClients().then(() => {
	process.exit(0);
});
