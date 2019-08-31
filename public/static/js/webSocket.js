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

const WebSocketEvent = {
	onConnection: 'CONNECTION',
	onAddDevice: 'DEVICE_ADD',
	onRemoveDevice: 'DEVICE_REMOVE',
	onAfterAddRemoveDevice: 'DEVICE_AFTER_ADD_REMOVE',
	onEmitHeartRate: 'HEART_RATE_EMIT',
	onArrivalHeartRate: 'HEART_RATE_ARRIVAL',
	onRequestDevices: 'DEVICES_REQUEST',
	onRetrieveDevices: 'DEVICES_RETRIEVE',
	onRequestHeartRates: 'HEART_RATES_REQUEST',
	onRetrieveHeartRates: 'HEART_RATES_RETRIEVE',
	onRequestFile: 'FILE_REQUEST',
	onRetrieveFile: 'FILE_RETRIEVE',
	onError: 'ERROR',
	onInvalidSession: 'SESSION_INVALID',
};

let socket;
let savedRawPulses = [];
let savedPulses = [];
let savedDevices = [];
let lastPulseReceived = new Date();
let selectedDeviceID = null;
let areWaitingResponses = {};
let socketStates = {};
let welcomeMessage = '';

function getSelectedDevice() {
	return savedDevices.find((dev) => dev._id === selectedDeviceID);
}

function onConnection(message) {
	welcomeMessage = message;
	console.log(welcomeMessage);
	createToast(ToastType.Success, welcomeMessage);
	addDeviceButtonElement.disabled = false;
	deviceSelectElement.innerHTML = '<option selected disabled>Getting device data...</option>';
	deviceSelectElement.disabled = true;
	socket.send(WebSocketEvent.onRequestDevices);
}

function onAddDevice() {
	const name = addDeviceNameElement.value;
	addModalJQueryElement.modal('hide');
	if (!name || name === '') {
		createToast(ToastType.Error, 'Failed to add device. Device name cannot be empty.');
		return;
	}
	createToast(ToastType.Information, 'Adding device "' + name + '"...');
	socket.send(WebSocketEvent.onAddDevice, name, onResponseEvent);
}

function onRemoveDevice() {
	const device = getSelectedDevice();
	removeModalJQueryElement.modal('hide');
	createToast(ToastType.Information, 'Removing device "' + device.name + '"...');
	socket.send(
		WebSocketEvent.onRemoveDevice,
		{
			deviceID: device._id,
			name: device.name,
		},
		onResponseEvent
	);
}

function onAfterAddRemoveDevice(success, message) {
	createToast(success ? ToastType.Success : ToastType.Error, message);
}

async function onEmitHeartRate(pulse) {
	const now = new Date().getTime();
	socket.send(WebSocketEvent.onArrivalHeartRate, { pulseID: pulse._id, timestamp: now });
	if (selectedDeviceID !== null && pulse.device_id === selectedDeviceID) {
		lastPulseReceived = now;
		const transportDelay = (lastPulseReceived - pulse.emitted_at) / 1000;
		heartRateElement.innerHTML = pulse.pulse;
		heartRateEmitTimeElement.innerHTML = transportDelay.toLocaleString('id-ID').concat(' seconds from device');
		if (USE_CHART === true) {
			pushChartData(pulse.pulse, transportDelay);
		}
		const rawRow = [pulse.pulse, pulse.emitted_at, lastPulseReceived, transportDelay];
		const row = [
			rawRow[0],
			formatDate(rawRow[1]),
			formatDate(rawRow[2]),
			rawRow[3].toLocaleString('id-ID').concat(' s'),
		];
		savedRawPulses.reverse();
		savedRawPulses.push(rawRow);
		savedPulses.reverse();
		savedPulses.push(row);
		const rows = savedPulses;
		addDataTableRows(rows.reverse());
	}
}

function onRetrieveDevices(devices) {
	selectedDeviceID = null;
	setDataTableText('Please select a device first.');
	removeDeviceButtonElement.disabled = true;
	removeDeviceButtonElement.innerHTML = 'Remove Device';
	savedDevices = devices;
	let deviceSelectHTML = '';
	for (const device of devices) {
		deviceSelectHTML =
			deviceSelectHTML +
			'<option value="' +
			device._id +
			'">' +
			device.name +
			' [ID: ' +
			device._id +
			']' +
			'</option>';
	}
	const firstOption = savedDevices.length > 0 ? 'Select a device...' : 'No device available.';
	deviceSelectElement.innerHTML = '<option selected disabled>' + firstOption + '</option>' + deviceSelectHTML;
	deviceSelectElement.disabled = savedDevices.length === 0;
}

async function onRetrieveHeartRates(pulses) {
	if (pulses.length === 0) {
		setDataTableText(
			'There are no any heart rates data for ' +
				getSelectedDevice().name +
				' [ID: ' +
				getSelectedDevice()._id +
				'].'
		);
		savedPulses = [];
		areWaitingResponses[WebSocketEvent.onRetrieveHeartRates] = false;
		return;
	}
	const rawRows = [];
	const rows = [];
	for (const pulse of pulses) {
		pulse.arrived_at = pulse.arrived_at ? pulse.arrived_at : null;
		const transportDelay = pulse.arrived_at ? (pulse.arrived_at - pulse.emitted_at) / 1000 : null;
		const rawRow = [pulse.pulse, pulse.emitted_at, pulse.arrived_at, transportDelay];
		const row = [
			rawRow[0],
			formatDate(rawRow[1]),
			rawRow[2] === null ? 'N/A' : formatDate(rawRow[2]),
			rawRow[3] === null
				? 'N/A'
				: parseFloat(rawRow[3])
						.toLocaleString('id-ID')
						.concat(' s'),
		];
		rawRows.push(rawRow);
		rows.push(row);
	}
	savedRawPulses = rawRows;
	savedPulses = rows;
	addDataTableRows(rows.reverse());
	areWaitingResponses[WebSocketEvent.onRetrieveHeartRates] = false;
}

function onRetrieveFile(fileName, dataURI) {
	hiddenDownloadLinkElement.setAttribute('download', fileName);
	hiddenDownloadLinkElement.setAttribute('href', dataURI);
	hiddenDownloadLinkElement.click();
}

async function onResponseEvent(event, data) {
	switch (event) {
		case WebSocketEvent.onConnection:
			onConnection(data);
			break;
		case WebSocketEvent.onAfterAddRemoveDevice:
			onAfterAddRemoveDevice(data.success, data.message);
			break;
		case WebSocketEvent.onEmitHeartRate:
			await onEmitHeartRate(data);
			break;
		case WebSocketEvent.onRetrieveDevices:
			onRetrieveDevices(data);
			break;
		case WebSocketEvent.onRetrieveHeartRates:
			await onRetrieveHeartRates(data);
			break;
		case WebSocketEvent.onRetrieveFile:
			await onRetrieveFile(data.fileName, data.dataURI);
			break;
		case WebSocketEvent.onError:
			onError(data);
			break;
		case WebSocketEvent.onInvalidSession:
			onInvalidSession();
			break;
	}
}

function onError(error) {
	const message = error.message || error.sqlMessage || 'An unexpected unknown error happened.';
	console.log('ERROR: ' + message);
	showAlert(AlertType.Danger, 'ERROR: ' + message, true);
	createToast(ToastType.Error, message);
}

function onInvalidSession() {
	initialiseSession(true).then(() => {
		socket.close();
	});
}

function startWebSocket() {
	const serverURI =
		(window.location.protocol === 'https:' ? 'wss:' : 'ws:') +
		'//' +
		window.location.hostname +
		':' +
		window.location.port +
		'/';
	socket = new WebSocket(serverURI);
	const _send = socket.send;
	socket.send = (event, data) => {
		_send.call(
			socket,
			JSON.stringify({
				sessionID: SESSION_IDENTIFIER,
				event: event,
				data: data,
			})
		);
	};
	const ping = () => {
		createToast(ToastType.Warning, 'Real-Time connection to server opened. Waiting for a response...');
		socket.send(WebSocketEvent.onConnection);
	};
	socket.onopen = function() {
		if (socketStates.reconnect !== true) {
			ping();
		} else {
			if (welcomeMessage !== '') {
				console.log(welcomeMessage);
				createToast(ToastType.Success, welcomeMessage);
			} else {
				ping();
			}
		}
		socketStates.reconnect = false;
	};
	socket.onclose = function() {
		addDeviceButtonElement.disabled = true;
		removeDeviceButtonElement.disabled = true;
		console.warn('WARNING: ' + 'Disconnected from Real-Time server! Retrying to connect...');
		createToast(ToastType.Warning, 'Disconnected from Real-Time server! Retrying to connect...');
		socketStates.reconnect = true;
		setTimeout(function() {
			startWebSocket();
		}, 1000);
	};
	socket.onmessage = (messageEvent) => {
		const { sessionID, event, data } = JSON.parse(messageEvent.data);
		if (!event) {
			return;
		}
		if (event !== WebSocketEvent.onInvalidSession) {
			if (!sessionID || sessionID !== SESSION_IDENTIFIER) {
				console.warn('WARNING: Live data with different session identifier received.');
				return;
			}
		}
		onResponseEvent(event, data);
	};
	socket.onerror = function(event) {
		event.preventDefault();
		onError(new Error('An unknown error happen on Real-Time server connection.'));
	};
}
