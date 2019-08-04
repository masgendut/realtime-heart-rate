import { Client } from './Client';
import Config from './Config';


export class Schema extends Client {
	const session = await this.createSession();
	const schema = await session.getSchema(Config.connectionOptions.schema);
	return (await schema.existsInDatabase())
? schema
		: (await session.createSchema(Config.connectionOptions.schema));
}
