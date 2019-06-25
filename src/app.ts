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

// Import dependencies
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import express from 'express';
import { json, urlencoded } from 'body-parser';
import SocketIO from 'socket.io';
import moment from 'moment';

// Import internal functions
import { docs } from './docs';
import { getDatabase } from "./helpers/database";
import { router, favicon, notFound } from "./helpers/express";
import { IDeviceModel } from './models/IDeviceModel';
import { IPulseModel } from './models/IPulseModel';

// Import .env config to process.env variable
dotenv.config();

// Declare and define variables
const app = express();
const onApp = router.use(app);
const server = new http.Server(app);
const io = SocketIO(server);
const port = process.env.PORT || 9000;

// Configure HTTP Server
docs(app); // Show Swagger UI as documentation on '/docs' path
app.use(json()); // Use JSON parser to parse JSON body as JavaScript object
app.use(urlencoded({ extended: false })); // Parse body as URL Encoded format

// Let HTTP Server serve front-end on "public" folder
app.use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico'))); // Serve favicon
app.use(express.static(path.join(__dirname, '..', 'public'))); // Static serve 'public' folder
onApp.get('/', true) // Serve front-end's "index.html"
	.handle(async (request, response) => {
		return response.send(
			path.join(__dirname, '..', 'public', 'index.html')
		);
	});

// HTTP REST API to be called by pulse sensor device
// whenever pulse sensor device should emit a new pulse value
onApp.get('/emit-pulse')
	.handle(async (request, response) => {
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
			device_id: parseInt(request.query.deviceId),
			pulse: parseFloat(request.query.pulse),
			emitted_at: moment(new Date(parseInt(request.query.timestamp)))
				.utc()
				.format('YYYY-MM-DD HH:mm:ss')
		};
		try {
			const database = await getDatabase();
			const devices: IDeviceModel[] = await database.query(
				'SELECT * FROM devices WHERE ?',
				{ id: pulse.device_id }
			);
			const device = devices.find(dev => dev.id === pulse.device_id);
			if (device === void 0) {
				return response.status(404).json({
					success: false,
					code: 404,
					message:
						'Device with ID ' + pulse.device_id + ' is not found.'
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
		} catch (e) {
			const message = e.message || 'Database Error: ' + e.sqlMessage || 'Unkown server error.';
			return response.status(500).json({
				success: false,
				code: 500,
				message: message,
				error: e
			});
		}
	})

// Handle not found error
app.use(notFound);

// Configure web socket for front-end
io.on('connection', function(socket) {
	const transportName = socket.conn.transport.name === 'websocket' ? 'Web Socket' : 'HTTP Long-Polling';
	socket.emit(
		WebSocketEvent.onConnection,
		'Connection to Real-Time server is established using ' + transportName + '.'
	);
	socket.conn.on('upgrade', function(transport) {
		const upgradeTransportName = transport.name === 'websocket' ? 'Web Socket' : 'HTTP Long-Polling';
		socket.emit(
			WebSocketEvent.onConnection,
			'Connection to Real-Time server is upgraded using ' + upgradeTransportName + '.'
		);
	})
	socket.on(WebSocketEvent.onAddDevice, async (name, emit) => {
		try {
			const database = await getDatabase();
			const { affectedRows  } = await database.query(
				'INSERT INTO devices SET ?',
				{ name }
			);
			const success = parseInt(affectedRows) > 0;
			const message = success
				? 'Device "' + name + '" has been successfully added!'
				: 'Failed to add "' + name + '". ';
			const devices: IDeviceModel[] = await database.query(
				'SELECT * FROM devices'
			);
			await database.end();
			emit(WebSocketEvent.onAfterAddRemoveDevice, { success, message });
			if (success) {
				socket.broadcast.emit(WebSocketEvent.onRetrieveDevices, devices);
			}
		} catch (e) {
			const message = e.message || 'Database Error: ' + e.sqlMessage || 'Unkown server error.';
			emit(WebSocketEvent.onAfterAddRemoveDevice, { 
				success: false,
				message: 'Failed to add "' + name + '". ' + message 
			});
		}
	});
	socket.on(WebSocketEvent.onRemoveDevice, async ({ id, name }, emit) => {
		try {
			const database = await getDatabase();
			const pulses: IPulseModel[] = await database.query(
				'SELECT * FROM pulses WHERE ?',
				{ device_id: id }
			);
			const pulseResult = await database.query(
				'DELETE FROM pulses WHERE ?',
				{ device_id: id }
			);
			const deviceResult = await database.query(
				'DELETE FROM devices WHERE ?',
				{ id }
			);
			const success = parseInt(pulseResult.affectedRows) === pulses.length 
				&& parseInt(deviceResult.affectedRows) > 0;
			const message = success
				? 'Device "' + name + '" has been successfully removed!'
				: 'Failed to remove "' + name + '". ';
			const devices: IDeviceModel[] = await database.query(
				'SELECT * FROM devices'
			);
			await database.end();
			emit(WebSocketEvent.onAfterAddRemoveDevice, { success, message });
			if (success) {
				socket.broadcast.emit(WebSocketEvent.onRetrieveDevices, devices);
			}
		} catch (e) {
			const message = e.message || 'Database Error: ' + e.sqlMessage || 'Unkown server error.';
			emit(WebSocketEvent.onAfterAddRemoveDevice, { 
				success: false,
				message: 'Failed to remove "' + name + '". ' + message 
			});
		}
	});
	socket.on(WebSocketEvent.onRequestDevices, async emit => {
		try {
			const database = await getDatabase();
			const devices: IDeviceModel[] = await database.query(
				'SELECT * FROM devices'
			);
			await database.end();
			emit(WebSocketEvent.onRetrieveDevices, devices);
		} catch (e) {
			const message = e.message || 'Database Error: ' + e.sqlMessage || 'Unkown server error.';
			const error = { message };
			emit(WebSocketEvent.onError, error);
		}
	});
	socket.on(WebSocketEvent.onRequestHeartRates, async (deviceId, emit) => {
		try {
			const database = await getDatabase();
			const pulses: IPulseModel[] = await database.query(
				'SELECT * FROM pulses WHERE ?',
				{ device_id: deviceId }
			);
			await database.end();
			emit(WebSocketEvent.onRetrieveHeartRates, pulses);
		} catch (e) {
			const message = e.message || 'Database Error: ' + e.sqlMessage || 'Unkown server error.';
			const error = { message };
			emit(WebSocketEvent.onError, error);
		}
	});
});

// Start server
server.listen(port, () => {
	console.log('Real time server started on port ' + port);
});

// Enum of Web Socket events
enum WebSocketEvent {
	onConnection = 'onConnection',
	onAddDevice = 'onAddDevice',
	onRemoveDevice = 'onRemoveDevice',
	onAfterAddRemoveDevice = 'onAfterAddRemoveDevice',
	onEmitHeartRate = 'onEmitHeartRate',
	onRequestDevices = 'onRequestDevices',
	onRetrieveDevices = 'onRetrieveDevices',
	onRequestHeartRates = 'onRequestHeartRates',
	onRetrieveHeartRates = 'onRetrieveHeartRates',
	onError = 'onError'
}
