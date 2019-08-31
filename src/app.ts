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
import UserAgent from 'useragent';
import isNumber from 'lodash.isnumber';

/**
 * Import internal functions
 */
import { docs } from './docs';
import Database from './helpers/database';
import DateTime from './helpers/datetime';
import { router, favicon, notFound } from "./helpers/express";
import UUID from './helpers/uuid';
import { IDeviceModel } from './models/IDeviceModel';
import { IPulseModel } from './models/IPulseModel';
import IClientModel from './models/IClientModel';
import ISessionModel from './models/ISessionModel';
import IPulseArrivalModel from './models/IPulseArrivalModel';

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
Database.getSessionPackage().then(({ client, session }) => {
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
	const { client, session, collections } = await Database.getSessionPackage();
	try {
		if (request.query.deviceId.length !== 36 && isNumber(parseInt(request.query.deviceId))) {
			// This means it is old device ID.
			const result = await collections.devices
				.find()
				.execute();
			const devices: IDeviceModel[] = <IDeviceModel[]> result.getDocuments();
			const device = devices.find(d => d.old_id === parseInt(request.query.deviceId));
			if (!!device) {
				request.query.deviceId = UUID.shortToRegular(
					(<IDeviceModel> result.getDocuments()[0])._id
				);
			} else {
				return response.status(404).json({
					success: false,
					code: 404,
					message:
						'Device with ID ' + request.query.deviceId + ' is not found.'
				});
			}
		}
		let pulse: IPulseModel = {
			_id: UUID.generate(),
			device_id: request.query.deviceId,
			pulse: parseFloat(request.query.pulse),
			emitted_at: DateTime.formatDate(parseInt(request.query.timestamp)),
			created_at: DateTime.formatDate()
		};
		pulse = UUID.transformIdentifierToShort(pulse);
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
		pulse = <IPulseModel>await collections.pulses.findByID(<string>pulse._id) ;
		await session.commit();
		serverBroadcast(WebSocketEvent.onEmitHeartRate, UUID.transformIdentifierToRegular(pulse));
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
	const { client, session, collections } = await Database.getSessionPackage();
	try {
		await session.startTransaction();
		const frontEndClient: IClientModel = <IClientModel>await collections.clients
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
			user_agent: UserAgent.lookup(request.headers['user-agent']),
			created_at: DateTime.formatDate()
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
		frontEndSession = <ISessionModel>await collections.sessions.findByID(<string>frontEndSession._id);
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
 * Handle an API to be called by front-end device to upgrade the client app version
 * by transforming client data to server data
 */
onApp.post('/client-upgrade').handle(async (request, response) => {
	const requiredField = ['currentVersion', 'targetVersion', 'sessionId', 'data'];
	for (const field of requiredField) {
		if (!request.body[field]) {
			return response.status(400).json({
				success: false,
				code: 400,
				message: 'Parameter "' + field + '" is required!'
			});
		}
	}
	const { currentVersion, targetVersion, sessionId, data } = request.body;
	const { client, session, collections } = await Database.getSessionPackage();
	try {
		let clientUpgraded = false;
		await session.startTransaction();
		if (targetVersion === '2.0.0') {
			const localPulses: {
				old_id: string,
				arrived_at: number
			}[] = data;
			const findPulseResult = await collections.pulses
				.find()
				.execute();
			const pulses: IPulseModel[] = <IPulseModel[]> findPulseResult.getDocuments();
			for (const { old_id, arrived_at } of localPulses) {
				const pulse = pulses.find(p => p.old_id === parseInt(old_id));
				if (!!pulse) {
					let pulseArrival: IPulseArrivalModel = {
						_id: UUID.generate(),
						session_id: sessionId,
						pulse_id: pulse._id,
						arrived_at: DateTime.formatDate(arrived_at),
						created_at: DateTime.formatDate()
					};
					pulseArrival = UUID.transformIdentifierToShort(pulseArrival);
					const addResult = await collections.pulse_arrivals
						.add(pulseArrival)
						.execute();
					if (addResult.getWarningsCount() > 0) {
						const warning = addResult.getWarnings()[0];
						return response.json({
							success: false,
							code: 400,
							message: warning.msg
						})
					}
				}
			}
			clientUpgraded = true;
		}
		await session.commit();
		return clientUpgraded 
			? response.json({
				success: true,
				code: 200,
				message: 'Client app upgrade request has been approved.',
				data: { currentVersion, targetVersion, sessionId }
			})
			: response.json({
				success: false,
				code: 400,
				message: 'Target version ' + targetVersion + ' is not available.'
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
function createPayload(sessionID: string, event: WebSocketEvent, data?: WebSocketData<unknown>): string {
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
function serverSend(socket: WebSocket, sessionID: string, event: WebSocketEvent, data?: WebSocketData<unknown>) {
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
function serverBroadcast(event: WebSocketEvent, data?: WebSocketData<unknown>) {
	webSocketServer.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			serverSend(
				client,
				(<{ sessionID: string }><unknown>client).sessionID,
				event,
				data);
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
 * onArrivalHeartRate()
 * This function will be fired when a client send an 'onArrivalHeartRate' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 * @param pulseID string Pulse identifier of the arrived pulse.
 * @param timestamp string The timestamp when the pulse arrived to the mentioned client.
 */
async function onArrivalHeartRate(socket: WebSocket, sessionID: string, pulseID: string, timestamp: string) {
	const { client, session, collections } = await Database.getSessionPackage();
	try {
		let pulseArrival: IPulseArrivalModel = {
			_id: UUID.generate(),
			session_id: sessionID,
			pulse_id: pulseID,
			arrived_at: DateTime.formatDate(parseInt(timestamp)),
			created_at: DateTime.formatDate()
		};
		pulseArrival = UUID.transformIdentifierToShort(pulseArrival);
		await session.startTransaction();
		const addResult = await collections.pulse_arrivals
			.add(pulseArrival)
			.execute();
		if (addResult.getWarningsCount() > 0) {
			const warnings = addResult.getWarnings();
			for (const warning of warnings) {
				onError(socket, sessionID, new Error(warning.msg))
			}
		}
		await session.commit();
	} catch (error) {
		await session.rollback();
		onError(socket, sessionID, error);
	} finally {
		await client.close();
	}
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
	const { client, session, collections } = await Database.getSessionPackage();
	try {
		let device: IDeviceModel = {
			_id: UUID.generate(),
			name: name,
			created_at: DateTime.formatDate()
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
		const success = addResult.getAffectedItemsCount() === 1;
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
 * @param deviceID string The device identifier string.
 * @param name string The device name.
 */
async function onRemoveDevice(socket: WebSocket, sessionID: string, deviceID: string, name: string) {
	const { client, session, collections } = await Database.getSessionPackage();
	try {
		deviceID = UUID.regularToShort(deviceID);
		await session.startTransaction();
		const findPulseResult = await collections.pulses
			.find({ device_id: deviceID })
			.execute();
		const pulses: IPulseModel[] = <IPulseModel[]>findPulseResult.getDocuments();
		const deletePulseResult = await collections.pulses
			.remove({ device_id: deviceID })
			.execute();
		if (deletePulseResult.getWarningsCount() > 0) {
			const warnings = deletePulseResult.getWarnings();
			for (const warning of warnings) {
				onError(socket, sessionID, new Error(warning.msg));
			}
		}
		const deleteDeviceResult = await collections.devices
			.removeByID(deviceID);
		if (deleteDeviceResult.getWarningsCount() > 0) {
			const warnings = deleteDeviceResult.getWarnings();
			for (const warning of warnings) {
				onError(socket, sessionID, new Error(warning.msg));
			}
		}
		const success = deletePulseResult.getAffectedItemsCount() === pulses.length
			&& deleteDeviceResult.getAffectedItemsCount() === 1;
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
	const { client, collections } = await Database.getSessionPackage();
	try {
		const findDeviceResult = await collections.devices.find().execute();
		let devices: IDeviceModel[] = [];
		for (const device of findDeviceResult.getDocuments()) {
			devices.push(UUID.transformIdentifierToRegular(device));
		}
		devices = devices.sort((a, b) => {
			const aDate = new Date(a.created_at);
			const bDate = new Date(b.created_at);
			return bDate.getTime() - aDate.getTime();
		});
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
 * @param deviceID string The device identifier string.
 */
async function onRequestHeartRates(socket: WebSocket, sessionID: string, deviceID: string) {
	const { client, collections } = await Database.getSessionPackage();
	try {
		deviceID = UUID.regularToShort(deviceID);
		const findPulseResult = await collections.pulses
			.find({ device_id: deviceID })
			.execute();
		const findPulseArrivalResult = await collections.pulse_arrivals
			.find()
			.execute();
		let pulses: IPulseModel[] = [];
		const pulseArrivals: IPulseArrivalModel[] = <IPulseArrivalModel[]>findPulseArrivalResult.getDocuments();
		for (const pulse of findPulseResult.getDocuments()) {
			const pulseArrival = pulseArrivals.find(_pulseArrival => {
				return _pulseArrival.pulse_id === pulse._id &&
					_pulseArrival.session_id === UUID.regularToShort(sessionID);
			});
			if (pulseArrival !== void 0) {
				(<IPulseModel>pulse).arrived_at = pulseArrival.arrived_at;
			}
			pulses.push(UUID.transformIdentifierToRegular(pulse));
		}
		pulses = pulses.sort((a, b) => {
			const aDate = new Date(a.emitted_at);
			const bDate = new Date(b.emitted_at);
			return aDate.getTime() - bDate.getTime();
		});
		serverSend(socket, sessionID, WebSocketEvent.onRetrieveHeartRates, pulses);
	} catch (error) {
		onError(socket, sessionID, error);
	} finally {
		await client.close();
	}
}

/**
 * onRequestFile()
 * This function will be fired when a client send an 'onRequestFile' event
 * to WebSocket server.
 *
 * @param socket WebSocket WebSocket client where the response should sent to.
 * @param sessionID string Session identifier of the client.
 * @param requestedFileID string The requested file identifier.
 */
async function onRequestFile(socket: WebSocket, sessionID: string, requestedFileID: string) {
	// const { client, collections } = await Database.getSessionPackage();
	// try {
	// 	const fileFormat = '.xlsx';
	// 	const fileName = 'heart-rates-'.concat(new Date().getTime().toString()).concat(fileFormat);
	// 	const dataURI = 'data:application/octet-stream,base64';
	// 	serverSend(socket, sessionID, WebSocketEvent.onRetrieveHeartRates, { fileName, dataURI });
	// } catch (error) {
	// 	onError(socket, sessionID, error);
	// } finally {
	// 	await client.close();
	// }
	onError(socket, sessionID, new Error('Download feature is not avaiable right now. Please check again later.'));
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
async function onRequestEvent(socket: WebSocket, sessionID: string, event: WebSocketEvent, data?: WebSocketData<unknown>) {
	switch (event) {
		case WebSocketEvent.onConnection:
			onConnection(socket, sessionID);
			break;
		case WebSocketEvent.onArrivalHeartRate:
			const { pulseID, timestamp } = <{
				pulseID: string,
				timestamp: string
			}>data;
			await onArrivalHeartRate(socket, sessionID, pulseID, timestamp);
			break;
		case WebSocketEvent.onAddDevice:
			await onAddDevice(socket, sessionID, <string>data);
			break;
		case WebSocketEvent.onRemoveDevice:
			const { deviceID, name } = <{
				deviceID: string,
				name: string
			}>data;
			await onRemoveDevice(socket, sessionID, deviceID, name);
			break;
		case WebSocketEvent.onRequestDevices:
			await onRequestDevices(socket, sessionID);
			break;
		case WebSocketEvent.onRequestHeartRates:
			const deviceID_ = <string>data;
			await onRequestHeartRates(socket, sessionID, deviceID_);
			break;
		case WebSocketEvent.onRequestFile:
			const requestedFileID = <string>data;
			await onRequestFile(socket, sessionID, requestedFileID);
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
function onError(socket: WebSocket, sessionID: string | null, e: unknown) {
	const message = (<Error>e).message || 'Internal server error.';
	const error = { message };
	console.error(e);
	serverSend(socket, <string>sessionID, WebSocketEvent.onError, error);
}

async function checkSession(socket: WebSocket, sessionID: string): Promise<boolean> {
	const { client, collections } = await Database.getSessionPackage();
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
			(<{ sessionID: string }><unknown>socket).sessionID = sessionID;
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
	onArrivalHeartRate = 'HEART_RATE_ARRIVAL',
	onRequestDevices = 'DEVICES_REQUEST',
	onRetrieveDevices = 'DEVICES_RETRIEVE',
	onRequestHeartRates = 'HEART_RATES_REQUEST',
	onRetrieveHeartRates = 'HEART_RATES_RETRIEVE',
	onRequestFile = 'FILE_REQUEST',
	onRetrieveFile = 'FILE_RETRIEVE',
	onError = 'ERROR',
	onInvalidEvent = 'EVENT_INVALID',
	onInvalidSession = 'SESSION_INVALID'
}

/**
 * Type WebSocketData defines data that might be sent by WebSocket server and
 * clients.
 */
type WebSocketData<T> = T;
