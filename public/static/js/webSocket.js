/**
 * Copyright 2019, Mokhamad Mustaqim & Danang Galuh Tegar Prasetyo..
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
	onConnection: 'onConnection',
	onAddDevice: 'onAddDevice',
	onRemoveDevice: 'onRemoveDevice',
	onAfterAddRemoveDevice: 'onAfterAddRemoveDevice',
	onEmitHeartRate: 'onEmitHeartRate',
	onRequestDevices: 'onRequestDevices',
	onRetrieveDevices: 'onRetrieveDevices',
	onRequestHeartRates: 'onRequestHeartRates',
	onRetrieveHeartRates: 'onRetrieveHeartRates',
	onError: 'onError'
};

let socket;
let savedPulses = [];
let savedDevices = [];
let lastPulseReceived = new Date();
let selectedDeviceID = null;

function getSelectedDevice() {
	return savedDevices.find(dev => dev.id === selectedDeviceID);
}

function onConnection(message) {
	console.log(message);
	createToast(ToastType.Success, message);
	addDeviceButtonElement.disabled = false;
	socket.send(WebSocketEvent.onRequestDevices);
}

function onAddDevice() {
	const name = addDeviceNameElement.value;
	addModalJQueryElement.modal('hide');
	if (!name || name === '') {
		createToast(ToastType.Danger, 'Failed to add device. Device name cannot be empty.');
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
		id: device.id,
		name: device.name
	}, onResponseEvent);
}

function onAfterAddRemoveDevice(success, message) {
	createToast(success ? ToastType.Success : ToastType.Danger, message);
}

async function onEmitHeartRate(pulse) {
	if (
		selectedDeviceID !== null &&
		parseInt(pulse.device_id) === selectedDeviceID
	) {
		lastPulseReceived = new Date();
		pulse.emitted_at = new Date(pulse.emitted_at);
		pulse.created_at = new Date(pulse.created_at);
		const receivedAt = moment(lastPulseReceived).format('L LTS');
		const transportDelay =
			(lastPulseReceived.getTime() - pulse.emitted_at.getTime()) / 1000;
		const localPulse = await putLocalPulse(pulse, lastPulseReceived, transportDelay.toString() + ' s');
		heartRateElement.innerHTML = localPulse.pulse;
		heartRateEmitTimeElement.innerHTML = transportDelay.toString() + ' seconds from device';
		if (USE_CHART === true) {
			pushChartData(localPulse.pulse, transportDelay);
		}
		const row = [
			localPulse.pulse,
			moment(localPulse.emitted_at).format('L LTS'),
			receivedAt,
			transportDelay.toString() + ' s'
		];
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
		device.id = parseInt(device.id);
		deviceSelectHTML = deviceSelectHTML + '<option value="' + device.id + '">'
			+ device.name + ' [ID: ' + device.id + ']' + '</option>';
		deviceIDs.push(device.id);
	}
	const firstOption = savedDevices.length > 0
		? 'Select a device...'
		: 'No device available.'
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
			+ getSelectedDevice().id + '].'
		);
		savedPulses = [];
		return;
	}
	const rows = [];
	for (const pulse of pulses) {
		pulse.created_at = new Date(pulse.created_at);
		pulse.emitted_at = new Date(pulse.emitted_at);
		const receivedAt = await getReceivedTimeFromLocalPulse(pulse);
		const transportDelay = await getTransportDelayFromLocalPulse(pulse);
		const row = [
			pulse.pulse,
			moment(pulse.emitted_at).format('L LTS'),
			receivedAt,
			transportDelay
		];
		rows.push(row);
	}
	savedPulses = rows;
	addDataTableRows(rows.reverse());
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
	}
}

function onError(error) {
	const message = (error.message || error.sqlMessage || 'An unexpected unknown error happened.');
	console.log('ERROR: ' + message);
	showAlert(AlertType.Danger, 'ERROR: ' + message, true);
	createToast(ToastType.Danger, message);
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
		_internalSend.call(socket, JSON.stringify({ event, data }));
	}
	socket.onopen = function() {
		createToast(
			ToastType.Warning,
			'Real-Time connection to server opened. Waiting for a response...'
		);
		socket.send(WebSocketEvent.onConnection);
	}
	socket.onclose = function() {
		addDeviceButtonElement.disabled = true;
		removeDeviceButtonElement.disabled = true;
		console.log('WARNING: ' + 'Disconnected from Real-Time server! Retrying to connect...');
		createToast(
			ToastType.Warning,'Disconnected from Real-Time server! Retrying to connect...'
		);
		setTimeout(function() { startWebSocket(); }, 1000);
	}
	socket.onmessage = messageEvent => {
		const { event, data } = JSON.parse(messageEvent.data);
		if (!event) {
			return;
		}
		onResponseEvent(event, data);
	}
	socket.onerror = function(event) {
		event.preventDefault();
		onError(new Error('An unknown error happen on Real-Time server connection.'));
	}
}