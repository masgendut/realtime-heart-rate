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

import path from 'path';
import http from 'http';
import express from 'express';
// @ts-ignore
import secure from 'express-force-https';
// @ts-ignore
import favicon from 'express-favicon';
import { json, urlencoded } from 'body-parser';
import asyncHandler from 'express-async-handler';
import SocketIO from 'socket.io';
import mysql from 'promise-mysql';
import moment from 'moment';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = new http.Server(app);
const io = SocketIO(server, {});
const port = process.env.PORT || 9000;
const mysqlConnectionConfig: mysql.ConnectionConfig = {
	host: process.env.DB_HOST || 'localhost',
	user: process.env.DB_USERNAME || 'root',
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME || 'heartrate',
	timezone: 'UTC',
	dateStrings: ['DATE', 'DATETIME']
};

async function getDatabase() {
	try {
		const connection = await mysql.createConnection(mysqlConnectionConfig);
		await connection.query("SET time_zone='+00:00';");
		return connection;
	} catch (error) {
		throw error;
	}
}

app.use(secure);
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get(
	'/',
	asyncHandler(async (request, response) => {
		return response.send(
			path.join(__dirname, '..', 'public', 'index.html')
		);
	})
);

app.get(
	'/emit-pulse',
	asyncHandler(async (request, response) => {
		const requiredField = ['deviceId', 'pulse', 'timestamp'];
		for (const field of requiredField) {
			if (!request.query[field]) {
				return response.status(400).json({
					success: false,
					code: 400,
					message: 'Parameter "' + field + '" is required!'
				});
			}
		}
		let pulse: IPulseModel = {
			deviceId: parseInt(request.query.deviceId),
			pulse: parseFloat(request.query.pulse),
			emitted_at: moment(new Date(parseInt(request.query.timestamp)))
				.utc()
				.format('YYYY-MM-DD HH:mm:ss')
		};
		try {
			const database = await getDatabase();
			const devices: IDeviceModel[] = await database.query(
				'SELECT * FROM devices WHERE ?',
				{ id: pulse.deviceId }
			);
			const device = devices.find(dev => dev.id === pulse.deviceId);
			if (device === void 0) {
				return response.status(400).json({
					success: false,
					code: 400,
					message:
						'Device with ID ' + pulse.deviceId + ' is not found.'
				});
			}
			const { insertId } = await database.query(
				'INSERT INTO pulses SET ?',
				pulse
			);
			const pulses: IPulseModel[] = await database.query(
				'SELECT * FROM pulses WHERE ?',
				{ id: insertId }
			);
			await database.end();
			pulse = pulses[0];
			io.emit(WebSocketEvent.onEmitHeartRate, pulse);
			return response.json({
				success: true,
				code: 200,
				message: 'New pulse data recorded successfully!',
				data: pulse
			});
		} catch (error) {
			return response.status(500).json({
				success: false,
				code: 500,
				message: error.message,
				error
			});
		}
	})
);

io.on('connection', function(socket) {
	socket.emit(
		WebSocketEvent.onConnection,
		'Connected to Real-Time server using Web Socket.'
	);
	socket.on(WebSocketEvent.onRequestDevices, async emit => {
		try {
			const database = await getDatabase();
			const devices: IDeviceModel[] = await database.query(
				'SELECT * FROM devices'
			);
			await database.end();
			emit(WebSocketEvent.onRetrieveDevices, devices);
		} catch (error) {
			emit(WebSocketEvent.onError, error);
		}
	});
	socket.on(WebSocketEvent.onRequestHeartRates, async (deviceId, emit) => {
		try {
			const database = await getDatabase();
			const pulses: IPulseModel[] = await database.query(
				'SELECT * FROM pulses WHERE ?',
				{ deviceId }
			);
			await database.end();
			emit(WebSocketEvent.onRetrieveHeartRates, pulses);
		} catch (error) {
			emit(WebSocketEvent.onError, error);
		}
	});
});

server.listen(port, () => {
	console.log('Real time server started on port ' + port);
});

enum WebSocketEvent {
	onConnection = 'onConnection',
	onEmitHeartRate = 'onEmitHeartRate',
	onRequestDevices = 'onRequestDevices',
	onRetrieveDevices = 'onRetrieveDevices',
	onRequestHeartRates = 'onRequestHeartRates',
	onRetrieveHeartRates = 'onRetrieveHeartRates',
	onError = 'onError'
}

interface IDeviceModel {
	id?: number;
	name: string;
	created_at?: string | Date;
	updated_at?: string | Date;
}

interface IPulseModel {
	id?: number;
	deviceId: number;
	pulse: number;
	emitted_at: string | Date;
	created_at?: string | Date;
}
