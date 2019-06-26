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

/**
 * Import dependencies
 */
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import express from 'express';
import { json, urlencoded } from 'body-parser';
import WebSocket from 'ws';
import moment from 'moment';

/**
 * Import internal functions
 */
import { docs } from './docs';
import { getDatabase } from "./helpers/database";
import { router, favicon, notFound } from "./helpers/express";
import { IDeviceModel } from './models/IDeviceModel';
import { IPulseModel } from './models/IPulseModel';

/**
 * Import configuration from .env file to process.env variable
 */
dotenv.config();

/**
 * Declare and define variables that will be used in the application
 */
const app = express();
const onApp = router.use(app);
const server = new http.Server(app);
const webSocketServer = new WebSocket.Server({ server });
const port = process.env.PORT || 9000;

/**
 * Configure Express framework and HTTP server
 */
docs(app); // Show Swagger UI as documentation on '/docs' path
app.use(json()); // Use JSON parser to parse JSON body as JavaScript object
app.use(urlencoded({ extended: false })); // Parse body as URL Encoded format

/**
 * Let Express serve front-end on "public" folder
 */
app.use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico'))); // Serve favicon
app.use(express.static(path.join(__dirname, '..', 'public'))); // Static serve 'public' folder
onApp.get('/', true).handle(async (request, response) => {
	return response.send(
		path.join(__dirname, '..', 'public', 'index.html')
	);
}); // Serve front-end's "index.html"

/**
 * Handle an API to be called by pulse sensor device whenever it should emit a
 * new pulse value.
 */
onApp.get('/emit-pulse').handle(async (request, response) => {
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
		serverBroadcast(WebSocketEvent.onEmitHeartRate, pulse);
		return response.json({
			success: true,
			code: 200,
			message: 'New pulse data recorded successfully!',
			data: pulse
		});
	} catch (e) {
		const message = e.message || 'Database Error: ' + e.sqlMessage || 'Internal server error.';
		return response.status(500).json({
			success: false,
			code: 500,
			message: message,
			error: e
		});
	}
});

/**
 * Handle everything else as 'not found'
 */
app.use(notFound);

/**
 * createPayload()
 * This function is used to create a WebSocket payload to be send to
 * WebSocket client.
 *
 * @param event WebSocketEvent WebSocket Event defined by WebSocketEvent enum.
 * @param data WebSocketData The payload body data.
 * @return object WebSocket payload.
 */
function createPayload(event: WebSocketEvent, data?: WebSocketData): string {
	return JSON.stringify({ event, data })
}

/**
 * serverSend()
 * This function is used to send a data to a single WebSocket client.
 *
 * @param socket WebSocket WebSocket client where the data should sent to.
 * @param event WebSocketEvent WebSocket Event defined by WebSocketEvent enum.
 * @param data WebSocketData The payload body data.
 */
function serverSend(socket: WebSocket, event: WebSocketEvent, data?: WebSocketData) {
	socket.send(createPayload(event, data))
}

/**
 * serverBroadcast()
 * This function is used to send a data to all the connected WebSocket
 * clients excluding sender (this server itself).
 *
 * @param event WebSocketEvent WebSocket Event defined by WebSocketEvent enum.
 * @param data WebSocketData The payload body data.
 */
function serverBroadcast(event: WebSocketEvent, data?: WebSocketData) {
	webSocketServer.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			serverSend(client, event, data)
		}
	});
}

/**
 * onConnection()
 * This function will be fired when a client send an 'onConnection' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 */
function onConnection(socket: WebSocket) {
	serverSend(socket, WebSocketEvent.onConnection, 'Connection to Real-Time server is established using Web Socket.');
}

/**
 * onAddDevice()
 * This function will be fired when a client send an 'onAddDevice' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param name string The device name.
 */
async function onAddDevice(socket: WebSocket, name: string) {
	try {
		const database = await getDatabase();
		const oldDevices: IDeviceModel[] = await database.query(
			'SELECT * FROM devices'
		);
		const id: number = oldDevices.length === 0 ? 1 : oldDevices.length + 1
		const { affectedRows  } = await database.query(
			'INSERT INTO devices SET ?',
			{ id, name }
		);
		const success = parseInt(affectedRows) > 0;
		const message = success
			? 'Device "' + name + '" has been successfully added!'
			: 'Failed to add "' + name + '". ';
		const devices: IDeviceModel[] = await database.query(
			'SELECT * FROM devices'
		);
		await database.end();
		serverSend(socket, WebSocketEvent.onAfterAddRemoveDevice, { success, message });
		if (success) {
			serverBroadcast(WebSocketEvent.onRetrieveDevices, devices);
		}
	} catch (e) {
		const message = e.message || 'Database Error: ' + e.sqlMessage || 'Unkown server error.';
		serverSend(socket, WebSocketEvent.onAfterAddRemoveDevice, {
			success: false,
			message: 'Failed to add "' + name + '". ' + message
		});
	}
}

/**
 * onRemoveDevice()
 * This function will be fired when a client send an 'onRemoveDevice' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param deviceId number The device ID number.
 * @param name string The device name.
 */
async function onRemoveDevice(socket: WebSocket, deviceId: number, name: string) {
	try {
		const database = await getDatabase();
		const pulses: IPulseModel[] = await database.query(
			'SELECT * FROM pulses WHERE ?',
			{ device_id: deviceId }
		);
		const pulseResult = await database.query(
			'DELETE FROM pulses WHERE ?',
			{ device_id: deviceId }
		);
		const deviceResult = await database.query(
			'DELETE FROM devices WHERE ?',
			{ id: deviceId }
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
		serverSend(socket, WebSocketEvent.onAfterAddRemoveDevice, { success, message });
		if (success) {
			serverBroadcast(WebSocketEvent.onRetrieveDevices, devices);
		}
	} catch (e) {
		const message = e.message || 'Database Error: ' + e.sqlMessage || 'Internal server error.';
		serverSend(socket, WebSocketEvent.onAfterAddRemoveDevice, {
			success: false,
			message: 'Failed to remove "' + name + '". ' + message
		});
	}
}

/**
 * onRequestDevices()
 * This function will be fired when a client send an 'onRequestDevices' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 */
async function onRequestDevices(socket: WebSocket) {
	try {
		const database = await getDatabase();
		const devices: IDeviceModel[] = await database.query(
			'SELECT * FROM devices'
		);
		await database.end();
		serverSend(socket, WebSocketEvent.onRetrieveDevices, devices);
	} catch (error) {
		onError(socket, error);
	}
}

/**
 * onRequestHeartRates()
 * This function will be fired when a client send an 'onRequestHeartRates' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param deviceId number The device ID number.
 */
async function onRequestHeartRates(socket: WebSocket, deviceId: number) {
	try {
		const database = await getDatabase();
		const pulses: IPulseModel[] = await database.query(
			'SELECT * FROM pulses WHERE ?',
			{ device_id: deviceId }
		);
		await database.end();
		serverSend(socket, WebSocketEvent.onRetrieveHeartRates, pulses);
	} catch (error) {
		onError(socket, error);
	}
}

/**
 * onRequestEvent()
 * This function will be fired when a client send an request event to WebSocket
 * server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param event WebSocketEvent WebSocket Event defined by WebSocketEvent enum.
 * @param data WebSocketData The payload body data.
 */
async function onRequestEvent(socket: WebSocket, event: WebSocketEvent, data?: WebSocketData) {
	switch (event) {
		case WebSocketEvent.onConnection:
			onConnection(socket);
			break;
		case WebSocketEvent.onAddDevice:
			await onAddDevice(socket, data);
			break;
		case WebSocketEvent.onRemoveDevice:
			await onRemoveDevice(socket, parseInt(data.id), data.name);
			break;
		case WebSocketEvent.onRequestDevices:
			await onRequestDevices(socket);
			break;
		case WebSocketEvent.onRequestHeartRates:
			await onRequestHeartRates(socket, parseInt(data));
			break;
	}
}

/**
 * onError()
 * This function will be fired when a client send an event, but the server failed
 * to handle the request of that event.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param e Error The Error object raised from an error.
 */
function onError(socket: WebSocket, e: any) {
	const message = e.message || 'Database Error: ' + e.sqlMessage || 'Internal server error.';
	const error = { message };
	serverSend(socket, WebSocketEvent.onError, error);
}

/**
 * Configure WebSocket
 */
webSocketServer.on('connection', function(socket) {
	socket.on('message', async (message) => {
		try {
			const { event, data } = JSON.parse(message.toString());
			if (!event) {
				return;
			}
			await onRequestEvent(socket, event, data);
		} catch (error) {
			onError(socket, error);
		}
	})
});

/**
 * Start HTTP server
 */
server.listen(port, () => {
	console.log('Real-Time server started on port ' + port);
});

/**
 * Enum WebSocketEvent defines events that might be sent by WebSocket server
 * and clients
 */
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

/**
 * Type WebSocketData defines data that might be sent by WebSocket server and
 * clients.
 */
type WebSocketData = any;
