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

import dotenv from 'dotenv';
import ConnectionOptions from '../database/types/ConnectionOptions';
import PoolingOptions from '../database/types/PoolingOptions';

dotenv.config();

class Config {

	public static readonly connectionOptions: ConnectionOptions = {
		host: process.env.DB_HOST || 'localhost',
		port: process.env.DB_PORT|| 33060,
		password: process.env.DB_PASSWORD,
		user: process.env.DB_USERNAME || 'root',
		schema: process.env.DB_NAME || 'heartrate',
	};

	public static readonly poolingOptions: PoolingOptions = {
		pooling: {
			enabled: true,
			maxSize: 3
		}
	};

}

export default Config;
