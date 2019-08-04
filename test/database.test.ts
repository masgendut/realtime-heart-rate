import Client from '../src/database/Client';
import Collection from '../src/database/Collection';
import { EventEmitter } from 'events';

class Test extends EventEmitter {

	private async addTest1(collection: Collection) {
		const addResult = await collection.add({
			name: 'Danang Galuh',
			age: 21,
			created_at: new Date()
		});
		if (addResult.isSuccess) {
			return addResult.data;
		} else {
			throw addResult.error;
		}
	}

	private async addTest2(collection: Collection) {
		const addResult = await collection.add({
			name: 'Choirul',
			age: 17,
			created_at: new Date()
		});
		if (addResult.isSuccess) {
			return addResult.data;
		} else {
			throw addResult.error;
		}
	}

	private async findTest(collection: Collection, id: string) {
		const findResult = await collection.find({ _id: id });
		if (findResult.isSuccess) {
			return findResult.data;
		} else {
			throw findResult.error;
		}
	}

	private async findOneTest(collection: Collection, id: string) {
		const findOneResult = await collection.findOne(id);
		if (findOneResult.isSuccess) {
			return findOneResult.data;
		} else {
			throw findOneResult.error;
		}
	}

	private async modifyTest(collection: Collection, id: string) {
		const modifyResult = await collection.modify({ _id: id }, {
			name: 'Danang Galuh',
			age: 24,
			updated_at: new Date()
		});
		if (modifyResult.isSuccess) {
			return modifyResult.data;
		} else {
			throw modifyResult.error;
		}
	}

	private async modifyOneTest(collection: Collection, id: string) {
		const modifyOneResult = await collection.modifyOne(id, {
			name: 'Choirul Amanah',
			age: 20,
			updated_at: new Date()
		});
		if (modifyOneResult.isSuccess) {
			return modifyOneResult.data;
		} else {
			throw modifyOneResult.error;
		}
	}

	private async removeTest(collection: Collection, id: string) {
		const removeResult = await collection.remove({ _id: id });
		if (removeResult.isSuccess) {
			return removeResult.data;
		} else {
			throw removeResult.error;
		}
	}

	private async removeOneTest(collection: Collection, id: string) {
		const removeOneResult = await collection.removeOne(id);
		if (removeOneResult.isSuccess) {
			return removeOneResult.data;
		} else {
			throw removeOneResult.error;
		}
	}

	private async runPromise() {
		const client = new Client();
		const schema  = await client.getSchema();
		if (schema === null) {
			throw new Error('Schema is null');
		}
		const collection = await schema.getCollection('test');
		if (collection === null) {
			throw new Error('Collection is null');
		}
		try {
			const addResult1 = await this.addTest1(collection);
			const addResult2 = await this.addTest2(collection);
			const addResults = [ addResult1, addResult2 ];
			this.emit('operation_finished', addResults);
			// const findResult = await this.findTest(collection, addResult1._id);
			// this.emit('operation_finished', findResult);
			const findOneResult = await this.findOneTest(collection, addResult2._id);
			this.emit('operation_finished', findOneResult);
			// const modifyResult = await this.modifyTest(collection, addResult1._id);
			// this.emit('operation_finished', modifyResult);
			const modifyOneResult = await this.modifyOneTest(collection, addResult2._id);
			this.emit('operation_finished', modifyOneResult);
			// const removeResult = await this.removeTest(collection, addResult1._id);
			// this.emit('operation_finished', removeResult);
			const removeOneResult = await this.removeOneTest(collection, addResult2._id);
			this.emit('operation_finished', removeOneResult);
			return {
				addResults,
				// findResult,
				findOneResult,
				// modifyResult,
				modifyOneResult,
				// removeResult,
				removeOneResult
			};
		} catch (error) {
			throw error;
		} finally {
			await client.close()
		}
	}

	public run() {
		this.runPromise()
			.then(result => {
				this.emit('test_finished', result);
			})
			.catch((error: Error) => {
				this.emit('error', error);
			})
	}

}

const test = new Test();
test.on('operation_finished', console.log);
test.on('test_finished', console.log);
test.on('error', function (error: Error) {
	console.log('Test Error: ' + error.message);
	console.error(error);
});
test.run();
