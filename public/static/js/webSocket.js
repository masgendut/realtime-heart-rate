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
	onArriveHeartRate: 'HEART_RATE_ARRIVE',
	onRequestDevices: 'DEVICES_REQUEST',
	onRetrieveDevices: 'DEVICES_RETRIEVE',
	onRequestHeartRates: 'HEART_RATES_REQUEST',
	onRetrieveHeartRates: 'HEART_RATES_RETRIEVE',
	onError: 'ERROR',
	onInvalidSession: 'SESSION_INVALID'
};

let socket;
let savedRawPulses = [];
let savedPulses = [];
let savedDevices = [];
let lastPulseReceived = new Date();
let selectedDeviceID = null;
let areWaitingResponses = { };
let socketStates = {};
let welcomeMessage = '';

function getSelectedDevice() {
	return savedDevices.find(dev => dev._id === selectedDeviceID);
}

function onConnection(message) {
	welcomeMessage = message;
	console.log(welcomeMessage);
	createToast(ToastType.Success, welcomeMessage);
	addDeviceButtonElement.disabled = false;
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
	socket.send(WebSocketEvent.onRemoveDevice, {
		_id: device._id,
		name: device.name
	}, onResponseEvent);
}

function onAfterAddRemoveDevice(success, message) {
	createToast(success ? ToastType.Success : ToastType.Error, message);
}

async function onEmitHeartRate(pulse) {
	if (
		selectedDeviceID !== null &&
		parseInt(pulse.device_id) === selectedDeviceID
	) {
		lastPulseReceived = new Date();
		pulse.emitted_at = new Date(pulse.emitted_at);
		pulse.created_at = new Date(pulse.created_at);
		const transportDelay =
			(lastPulseReceived.getTime() - pulse.emitted_at.getTime()) / 1000;
		const localPulse = await putLocalPulse(
			pulse,
			lastPulseReceived,
			transportDelay
		);
		heartRateElement.innerHTML = localPulse.pulse;
		heartRateEmitTimeElement.innerHTML = transportDelay.toLocaleString('id-ID').concat(' seconds from device');
		if (USE_CHART === true) {
			pushChartData(localPulse.pulse, transportDelay);
		}
		const rawRow = [
			localPulse.pulse,
			localPulse.emitted_at,
			lastPulseReceived,
			transportDelay
		];
		const row = [
			rawRow[0],
			moment(rawRow[1]).format('L LTS'),
			moment(rawRow[2]).format('L LTS'),
			rawRow[3].toLocaleString('id-ID').concat(' s')
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
	const deviceIDs = [];
	let deviceSelectHTML = '';
	for (const device of devices) {
		deviceSelectHTML = deviceSelectHTML + '<option value="' + device._id + '">'
			+ device.name + ' [ID: ' + device._id + ']' + '</option>';
		deviceIDs.push(device._id);
	}
	const firstOption = savedDevices.length > 0
		? 'Select a device...'
		: 'No device available.';
	deviceSelectElement.innerHTML =
		'<option selected disabled>' + firstOption + '</option>' +
		deviceSelectHTML;
	deviceSelectElement.disabled = savedDevices.length === 0;
	checkLocalPulseByDeviceIDs(deviceIDs);
}

async function onRetrieveHeartRates(pulses) {
	if (pulses.length === 0) {
		setDataTableText(
			'There are no any heart rates data for '
			+ getSelectedDevice().name + ' [ID: '
			+ getSelectedDevice()._id + '].'
		);
		savedPulses = [];
		areWaitingResponses[WebSocketEvent.onRetrieveHeartRates] = false;
		return;
	}
	const rawRows = [];
	const rows = [];
	for (const pulse of pulses) {
		pulse.created_at = new Date(pulse.created_at);
		pulse.emitted_at = new Date(pulse.emitted_at);
		const receivedAt = await getReceivedTimeFromLocalPulse(pulse);
		const transportDelay = await getTransportDelayFromLocalPulse(pulse);
		const rawRow = [
			pulse.pulse,
			pulse.emitted_at,
			receivedAt,
			transportDelay
		];
		const row = [
			rawRow[0],
			moment(rawRow[1]).format('L LTS'),
			rawRow[2] === null
				? 'N/A'
				: moment(rawRow[2]).format('L LTS'),
			rawRow[3] === null
				? 'N/A'
				: parseFloat(rawRow[3])
					.toLocaleString('id-ID')
					.concat(' s')
		];
		rawRows.push(rawRow);
		rows.push(row);
	}
	savedRawPulses = rawRows;
	savedPulses = rows;
	addDataTableRows(rows.reverse());
	areWaitingResponses[WebSocketEvent.onRetrieveHeartRates] = false;
}

function onResponseEvent(event, data) {
	switch (event) {
		case WebSocketEvent.onConnection:
			onConnection(data);
			break;
		case WebSocketEvent.onAfterAddRemoveDevice:
			onAfterAddRemoveDevice(data.success, data.message);
			break;
		case WebSocketEvent.onEmitHeartRate:
			onEmitHeartRate(data).then(() => {});
			break;
		case WebSocketEvent.onRetrieveDevices:
			onRetrieveDevices(data);
			break;
		case WebSocketEvent.onRetrieveHeartRates:
			onRetrieveHeartRates(data).then(() => {});
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
	const message = (error.message || error.sqlMessage || 'An unexpected unknown error happened.');
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
		(window.location.protocol === 'https:' ? 'wss:' : 'ws:')+
		'//' +
		window.location.hostname +
		':' +
		window.location.port +
		'/';
	socket = new WebSocket(serverURI)
	const _internalSend = socket.send;
	socket.send = (event, data) => {
		_internalSend.call(socket, JSON.stringify({
			sessionID: SESSION_IDENTIFIER,
			event: event,
			data: data
		}));
	};
	socket.onopen = function() {
		function ping() {
			createToast(
				ToastType.Warning,
				'Real-Time connection to server opened. Waiting for a response...'
			);
			socket.send(WebSocketEvent.onConnection);
		}
		if (socketStates.reconnect !== true) {
			ping();
		} else {
			if (welcomeMessage !== '') {
				console.log(welcomeMessage);
				createToast(
					ToastType.Success,
					welcomeMessage
				);
			} else {
				ping();
			}
		}
		socketStates.reconnect = false;
	};
	socket.onclose = function() {
		addDeviceButtonElement.disabled = true;
		removeDeviceButtonElement.disabled = true;
		console.log('WARNING: ' + 'Disconnected from Real-Time server! Retrying to connect...');
		createToast(
			ToastType.Warning,'Disconnected from Real-Time server! Retrying to connect...'
		);
		socketStates.reconnect = true;
		setTimeout(function() { startWebSocket(); }, 1000);
	};
	socket.onmessage = messageEvent => {
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
