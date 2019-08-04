/**
 * Copyright 2019, Mokhamad Mustaqim & Danang Galuh Tegar Prasetyo.
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
import UAParser from 'ua-parser';

/**
 * Import internal functions
 */
import DatabaseConfig from './config/database.config';
import Client from './database/Client';
import { docs } from './docs';
import DatabaseHelper from './helpers/database';
import DateTime from './helpers/datetime';
import { router, favicon, notFound } from "./helpers/express";
import UUID from './helpers/uuid';
import { IDeviceModel } from './models/IDeviceModel';
import { IPulseModel } from './models/IPulseModel';
import IClientModel from './models/IClientModel';
import ISessionModel from './models/ISessionModel';

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
 * Create client connection to the database and set the database time system to use UTC
 */
DatabaseHelper.prepareDatabase().then(({ client, session }) => {
	return session.startTransaction()
		.then(() => {
			return session.sql('SET time_zone=\'+00:00\';').execute();
		})
		.then(() => {
			return session.commit();
		})
		.then(() => {
			return client.close();
		});
});


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
		_id: UUID.generate(),
		device_id: request.query.deviceId,
		pulse: parseFloat(request.query.pulse),
		emitted_at: DateTime.formatDate(new Date(parseInt(request.query.timestamp))),
		created_at: DateTime.formatDate(new Date())
	};
	pulse = UUID.transformIdentifierToShort(pulse);
	const { client, session, collections } = await DatabaseHelper.prepareDatabase();
	try {
		const device = await collections.devices
			.findByID(pulse.device_id);
		if (!device) {
			return response.status(404).json({
				success: false,
				code: 404,
				message:
					'Device with ID ' + UUID.shortToRegular(pulse.device_id) + ' is not found.'
			});
		}
		const addResult = await collections.pulses
			.add(pulse)
			.execute();
		if (addResult.getWarningsCount() > 0) {
			const warnings = addResult.getWarnings();
			return response.status(404).json({
				success: false,
				code: warnings[0].code,
				message: warnings[0].msg
			});
		}
		pulse = await collections.pulses.findByID(<string>pulse._id);
		await session.commit();
		serverBroadcast(WebSocketEvent.onEmitHeartRate, pulse);
		return response.json({
			success: true,
			code: 200,
			message: 'New pulse data recorded successfully!',
			data: UUID.transformIdentifierToRegular(pulse)
		});
	} catch (e) {
		await session.rollback();
		const message = e.message || 'Internal server error.';
		return response.status(500).json({
			success: false,
			code: 500,
			message: message,
			error: e
		});
	} finally {
		await client.close();
	}
});

/**
 * Handle an API to be called by front-end device to register itself and return
 * the session ID
 */
onApp.post('/register-session').handle(async (request, response) => {
	const requiredField = ['clientId'];
	for (const field of requiredField) {
		if (!request.body[field]) {
			return response.status(400).json({
				success: false,
				code: 400,
				message: 'Parameter "' + field + '" is required!'
			});
		}
	}
	const { client, session, collections } = await DatabaseHelper.prepareDatabase();
	try {
		await session.startTransaction();
		const frontEndClient: IClientModel = await collections.clients
			.findByID(UUID.regularToShort(request.body.clientId));
		if (!frontEndClient) {
			return response.status(404).json({
				success: false,
				code: 404,
				message:
					'Front-End Client with ID ' + request.body.clientId + ' is not found.'
			});
		}
		let frontEndSession: ISessionModel = {
			_id: UUID.generate(),
			client_id: request.body.clientId,
			user_agent: UAParser.parse(request.headers['user-agent']),
			created_at: DateTime.formatDate(new Date())
		};
		frontEndSession = UUID.transformIdentifierToShort(frontEndSession);
		const addResult = await collections.sessions
			.add(frontEndSession)
			.execute();
		if (addResult.getWarningsCount() > 0) {
			const warnings = addResult.getWarnings();
			return response.status(404).json({
				success: false,
				code: warnings[0].code,
				message: warnings[0].msg
			});
		}
		frontEndSession = await collections.sessions.findByID(<string>frontEndSession._id);
		await session.commit();
		return response.json({
			success: true,
			code: 200,
			message: 'Front-End Client device successfully registered!',
			data: UUID.transformIdentifierToRegular(frontEndSession)
		});
	} catch (e) {
		await session.rollback();
		const message = e.message || 'Internal server error.';
		return response.status(500).json({
			success: false,
			code: 500,
			message: message,
			error: e
		});
	} finally {
		await client.close();
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
 * @param sessionID string Session identifier of the client.
 * @param event WebSocketEvent WebSocket Event defined by WebSocketEvent enum.
 * @param data WebSocketData The payload body data.
 * @return object WebSocket payload.
 */
function createPayload(sessionID: string, event: WebSocketEvent, data?: WebSocketData): string {
	return JSON.stringify({ sessionID, event, data })
}

/**
 * serverSend()
 * This function is used to send a data to a single WebSocket client.
 *
 * @param sessionID string Session identifier of the client.
 * @param socket WebSocket WebSocket client where the data should sent to.
 * @param event WebSocketEvent WebSocket Event defined by WebSocketEvent enum.
 * @param data WebSocketData The payload body data.
 */
function serverSend(socket: WebSocket, sessionID: string, event: WebSocketEvent, data?: WebSocketData) {
	socket.send(createPayload(sessionID, event, data))
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
			serverSend(client, (<any>client).sessionID, event, data)
		}
	});
}

/**
 * onConnection()
 * This function will be fired when a client send an 'onConnection' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 */
function onConnection(socket: WebSocket, sessionID: string) {
	serverSend(socket, sessionID, WebSocketEvent.onConnection, 'Connection to Real-Time server is established using Web Socket.');
}

/**
 * onAddDevice()
 * This function will be fired when a client send an 'onAddDevice' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 * @param name string The device name.
 */
async function onAddDevice(socket: WebSocket, sessionID: string, name: string) {
	const { client, session, collections } = await DatabaseHelper.prepareDatabase();
	try {
		let device: IDeviceModel = {
			_id: UUID.generate(),
			name: name,
			created_at: DateTime.formatDate(new Date())
		};
		device = UUID.transformIdentifierToShort(device);
		await session.startTransaction();
		const addResult = await collections.devices
			.add(device)
			.execute();
		if (addResult.getWarningsCount() > 0) {
			const warnings = addResult.getWarnings();
			for (const warning of warnings) {
				onError(socket, sessionID, new Error(warning.msg))
			}
		}
		const success = addResult.getAffectedRowsCount() === 1;
		const message = success
			? 'Device "' + name + '" has been successfully added!'
			: 'Failed to add "' + name + '". ';
		serverSend(socket, sessionID, WebSocketEvent.onAfterAddRemoveDevice, { success, message });
		if (success) {
			const findDeviceResult = await collections.devices
				.find()
				.execute();
			const devices: IDeviceModel[] = [];
			for (const device of findDeviceResult.getDocuments()) {
				devices.push(UUID.transformIdentifierToRegular(device));
			}
			serverBroadcast(WebSocketEvent.onRetrieveDevices, devices);
		}
		await session.commit();
	} catch (e) {
		await session.rollback();
		const message = e.message || 'Unknown server error.';
		serverSend(socket, sessionID, WebSocketEvent.onAfterAddRemoveDevice, {
			success: false,
			message: 'Failed to add "' + name + '". ' + message
		});
	} finally {
		await client.close();
	}
}

/**
 * onRemoveDevice()
 * This function will be fired when a client send an 'onRemoveDevice' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 * @param deviceId string The device identifier string.
 * @param name string The device name.
 */
async function onRemoveDevice(socket: WebSocket, sessionID: string, deviceId: string, name: string) {
	const { client, session, collections } = await DatabaseHelper.prepareDatabase();
	try {
		deviceId = UUID.regularToShort(deviceId);
		await session.startTransaction();
		const findPulseResult = await collections.pulses
			.find({ device_id: deviceId })
			.execute();
		const pulses: IPulseModel[] = findPulseResult.getDocuments();
		const deletePulseResult = await collections.pulses
			.remove({ device_id: deviceId })
			.execute();
		if (deletePulseResult.getWarningsCount() > 0) {
			const warnings = deletePulseResult.getWarnings();
			for (const warning of warnings) {
				onError(socket, sessionID, new Error(warning.msg));
			}
		}
		const deleteDeviceResult = await collections.pulses
			.removeByID(deviceId);
		if (deleteDeviceResult.getWarningsCount() > 0) {
			const warnings = deleteDeviceResult.getWarnings();
			for (const warning of warnings) {
				onError(socket, sessionID, new Error(warning.msg));
			}
		}
		const success = deletePulseResult.getAffectedRowsCount() === pulses.length
			&& deleteDeviceResult.getAffectedRowsCount() === 1;
		const message = success
			? 'Device "' + name + '" has been successfully removed!'
			: 'Failed to remove "' + name + '". ';
		serverSend(socket, sessionID, WebSocketEvent.onAfterAddRemoveDevice, { success, message });
		if (success) {
			const findDeviceResult = await collections.devices
				.find()
				.execute();
			const devices: IDeviceModel[] = [];
			for (const device of findDeviceResult.getDocuments()) {
				devices.push(UUID.transformIdentifierToRegular(device));
			}
			serverBroadcast(WebSocketEvent.onRetrieveDevices, devices);
		}
		await session.commit();
	} catch (e) {
		await session.rollback();
		const message = e.message || 'Database Error: ' + e.sqlMessage || 'Internal server error.';
		serverSend(socket, sessionID, WebSocketEvent.onAfterAddRemoveDevice, {
			success: false,
			message: 'Failed to remove "' + name + '". ' + message
		});
	} finally {
		await client.close();
	}
}

/**
 * onRequestDevices()
 * This function will be fired when a client send an 'onRequestDevices' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 */
async function onRequestDevices(socket: WebSocket, sessionID: string) {
	const { client, collections } = await DatabaseHelper.prepareDatabase();
	try {
		const findDeviceResult = await collections.devices.find().execute();
		const devices: IDeviceModel[] = [];
		for (const device of findDeviceResult.getDocuments()) {
			devices.push(UUID.transformIdentifierToRegular(device));
		}
		serverSend(socket, sessionID, WebSocketEvent.onRetrieveDevices, devices);
	} catch (error) {
		onError(socket, sessionID, error);
	} finally {
		await client.close();
	}
}

/**
 * onRequestHeartRates()
 * This function will be fired when a client send an 'onRequestHeartRates' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 * @param deviceId string The device identifier string.
 */
async function onRequestHeartRates(socket: WebSocket, sessionID: string, deviceId: string) {
	const { client, collections } = await DatabaseHelper.prepareDatabase();
	try {
		deviceId = UUID.regularToShort(deviceId);
		const findPulseResult = await collections.pulses.find({ device_id: deviceId }).execute();
		const pulses: IPulseModel[] = [];
		for (const pulse of findPulseResult.getDocuments()) {
			pulses.push(UUID.transformIdentifierToRegular(pulse));
		}
		serverSend(socket, sessionID, WebSocketEvent.onRetrieveHeartRates, pulses);
	} catch (error) {
		onError(socket, sessionID, error);
	} finally {
		await client.close();
	}
}

/**
 * onRequestEvent()
 * This function will be fired when a client send an request event to WebSocket
 * server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 * @param event WebSocketEvent WebSocket Event defined by WebSocketEvent enum.
 * @param data WebSocketData The payload body data.
 */
async function onRequestEvent(socket: WebSocket, sessionID: string, event: WebSocketEvent, data?: WebSocketData) {
	switch (event) {
		case WebSocketEvent.onConnection:
			onConnection(socket, sessionID);
			break;
		case WebSocketEvent.onAddDevice:
			await onAddDevice(socket, sessionID, data);
			break;
		case WebSocketEvent.onRemoveDevice:
			await onRemoveDevice(socket, sessionID, data._id, data.name);
			break;
		case WebSocketEvent.onRequestDevices:
			await onRequestDevices(socket, sessionID);
			break;
		case WebSocketEvent.onRequestHeartRates:
			await onRequestHeartRates(socket, sessionID, data);
			break;
	}
}

/**
 * onError()
 * This function will be fired when a client send an event, but the server failed
 * to handle the request of that event.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 * @param e Error The Error object raised from an error.
 */
function onError(socket: WebSocket, sessionID: string | null, e: any) {
	const message = e.message || 'Internal server error.';
	const error = { message };
	console.error(e);
	serverSend(socket, <string>sessionID, WebSocketEvent.onError, error);
}

async function checkSession(socket: WebSocket, sessionID: string): Promise<boolean> {
	const { client, collections } = await DatabaseHelper.prepareDatabase();
	let session;
	try {
		session = await collections.sessions.findByID(UUID.regularToShort(sessionID));
	} catch (error) {
		onError(socket, sessionID, error);
	} finally {
		await client.close();
	}
	return !!session;
}

/**
 * Configure WebSocket
 */
webSocketServer.on('connection', function(socket) {
	socket.on('message', async (message) => {
		try {
			const { sessionID, event, data } = JSON.parse(message.toString());
			if (!sessionID || !(await checkSession(socket, sessionID))) {
				serverSend(socket, sessionID, WebSocketEvent.onInvalidSession, sessionID);
				return;
			}
			(<any>socket).sessionID = sessionID;
			if (!event) {
				serverSend(socket, sessionID, WebSocketEvent.onInvalidEvent);
				return;
			}
			await onRequestEvent(socket, sessionID, event, data);
		} catch (error) {
			onError(socket, null, error);
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
	onConnection = 'CONNECTION',
	onAddDevice = 'DEVICE_ADD',
	onRemoveDevice = 'DEVICE_REMOVE',
	onAfterAddRemoveDevice = 'DEVICE_AFTER_ADD_REMOVE',
	onEmitHeartRate = 'HEART_RATE_EMIT',
	onArriveHeartRate = 'HEART_RATE_ARRIVE',
	onRequestDevices = 'DEVICES_REQUEST',
	onRetrieveDevices = 'DEVICES_RETRIEVE',
	onRequestHeartRates = 'HEART_RATES_REQUEST',
	onRetrieveHeartRates = 'HEART_RATES_RETRIEVE',
	onError = 'ERROR',
	onInvalidEvent = 'EVENT_INVALID',
	onInvalidSession = 'SESSION_INVALID'
}

/**
 * Type WebSocketData defines data that might be sent by WebSocket server and
 * clients.
 */
type WebSocketData = any;
