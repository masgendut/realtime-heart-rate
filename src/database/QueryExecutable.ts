/**
 * Copyright 2019, Danang Galuh Tegar Prasetyo.
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

export class QueryExecutable {

	private readonly xSqlExecute;

	constructor(xSqlExecute) {
		this.xSqlExecute = xSqlExecute;
	}

	public bind(...values: string[]): QueryExecutable {
		this.xSqlExecute.bind(...values);
		return this;
	}

	public execute(): Promise<any[]> {
		return new Promise((resolve, reject) => {
			this.xSqlExecute.execute(result => {
				resolve(result);
			}).catch(error => {
				reject(error);
			});
		});
	}

}

export default QueryExecutable;