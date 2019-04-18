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
import mysql from "promise-mysql";

dotenv.config();

const mysqlConnectionConfig: mysql.ConnectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'heartrate',
    timezone: 'UTC',
    dateStrings: ['DATE', 'DATETIME']
};

export async function getDatabase() {
    try {
        const connection = await mysql.createConnection(mysqlConnectionConfig);
        await connection.query("SET time_zone='+00:00';");
        return connection;
    } catch (error) {
        throw error;
    }
}