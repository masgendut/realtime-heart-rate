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

const AlertType = {
	Primary: 'primary',
	Secondary: 'secondary',
	Success: 'success',
	Danger: 'danger',
	Warning: 'warning',
	Info: 'info',
	Light: 'light',
	Dark: 'dark'
};
const informationElement = document.querySelector('.information');
const deviceSelectElement = document.querySelector('.device-select');
const heartRateElement = document.querySelector('.heart-rate');
const heartRateEmitTimeElement = document.querySelector(
	'.heart-rate-emit-time'
);
const addDeviceButtonElement = document.querySelector('#add-device-button');
const removeDeviceButtonElement = document.querySelector('#remove-device-button');
const addDeviceNameElement = document.querySelector('#add-device-name');
const removeDeviceNameElement = document.querySelector('#remove-device-name');
const tableJQueryElement = $('.heart-rate-table');
const addModalJQueryElement = $('#add-modal');
const removeModalJQueryElement = $('#remove-modal');

let datatable = null;
let lastPulseReceived = new Date();
let devices = [];
let tableData = [];
let selectedDeviceId = null;

function addNewOption(value, option) {
	return '<option value="' + value + '">' + option + '</option>';
}

function addDataTableRows(rows) {
	if (!Array.isArray(rows)) {
		console.log(
			'Rows on Data Table "addDataTableRows" is not an array. Parsing failed!'
		);
		return;
	}
	datatable.clear();
	datatable.rows.add(rows);
	datatable.draw();
}

function setDataTableText(text) {
	if (datatable) {
		datatable.destroy();
	}
	datatable = tableJQueryElement.DataTable({
		data: [],
		language: {
			emptyTable: text
		},
		ordering: false
	});
}

function showAlert(type, message, isReplace) {
	if (isReplace === true) {
		informationElement.innerHTML =
			'<div class="alert alert-' +
			type +
			' alert-dismissible fade show" role="alert" role="alert">' +
			message +
			'<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>';
	} else {
		informationElement.innerHTML =
			informationElement.innerHTML +
			'<div class="alert alert-' +
			type +
			' alert-dismissible fade show" role="alert" role="alert">' +
			message +
			'<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>';
	}
}

function getSelectedDevice() {
	return devices.find(dev => dev.id === selectedDeviceId);
}

function onShowAddDevice() {
	addDeviceNameElement.value = '';
	addModalJQueryElement.modal('show');
}

function onShowRemoveDevice() {
	const device = getSelectedDevice();
	removeDeviceNameElement.innerHTML = device.name + ' [ID: ' + device.id + ']';
	removeModalJQueryElement.modal('show');
}

function onAddDevice() {
	const name = addDeviceNameElement.value;
	addModalJQueryElement.modal('hide');
	if (!name || name === '') {
		showAlert(AlertType.Danger, 'Failed to add device. Device name cannot be empty.');
		return;
	}
	showAlert(AlertType.Info, 'Adding device "' + name + '"...', true);
	socket.send(createPayload(WebSocketEvent.onAddDevice, name));
}

function onRemoveDevice() {
	const device = getSelectedDevice();
	removeModalJQueryElement.modal('hide');
	showAlert(AlertType.Info, 'Removing device "' + device.name + '"...', true);
	socket.send(createPayload(WebSocketEvent.onRemoveDevice, {
		id: device.id,
		name: device.name
	}));
}

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

function createPayload(event, data) {
	return JSON.stringify({ event, data });
}

function onConnection(message) {
	console.log(message);
	showAlert(AlertType.Success, message, true);
	addDeviceButtonElement.disabled = false;
	socket.send(createPayload(WebSocketEvent.onRequestDevices));
}

function onAfterAddRemoveDevice(success, message) {
	showAlert(success ? AlertType.Success : AlertType.Danger, message, true);
	if (success) {
		setDataTableText('Please select a device first.');
		removeDeviceButtonElement.disabled = true;
		removeDeviceButtonElement.innerHTML = 'Remove Device';
		socket.send(createPayload(WebSocketEvent.onRequestDevices));
	}
}

function onEmitHeartRate(pulse) {
	if (
		selectedDeviceId !== null &&
		parseInt(pulse.device_id) === selectedDeviceId
	) {
		lastPulseReceived = new Date();
		pulse.emitted_at = new Date(pulse.emitted_at);
		pulse.created_at = new Date(pulse.created_at);
		const transportDelay =
			(lastPulseReceived.getTime() - pulse.emitted_at.getTime()) / 1000;
		heartRateElement.innerHTML = pulse.pulse;
		heartRateEmitTimeElement.innerHTML =
			transportDelay.toString() + ' seconds from device';
		const row = [
			pulse.pulse,
			moment(pulse.emitted_at).format('lll'),
			transportDelay.toString() + ' s'
		];
		tableData.reverse();
		tableData.push(row);
		const rows = tableData;
		addDataTableRows(rows.reverse());
	}
}

function onRetrieveDevices(_devices) {
	devices = _devices;
	let deviceSelectHTML = '';
	for (const device of _devices) {
		device.id = parseInt(device.id);
		deviceSelectHTML =
			deviceSelectHTML + addNewOption(device.id, device.name + ' [ID: ' + device.id + ']');
	}
	const firstOption = devices.length > 0
		? 'Select a device...'
		: 'No device available.'
	deviceSelectElement.innerHTML =
		'<option selected disabled>' + firstOption + '</option>' +
		deviceSelectHTML;
	deviceSelectElement.disabled = devices.length === 0;
}

function onRetrieveHeartRates(pulses) {
	if (pulses.length === 0) {
		setDataTableText(
			'There are no any heart rates data for '
				+ getSelectedDevice().name + ' [ID: '
				+ getSelectedDevice().id + '].'
		);
		tableData = [];
		return;
	}
	const rows = [];
	for (const pulse of pulses) {
		pulse.emitted_at = new Date(pulse.emitted_at);
		const row = [pulse.pulse, moment(pulse.emitted_at).format('lll'), ''];
		rows.push(row);
	}
	tableData = rows;
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
		case WebSocketEvent.onRetrieveDevices:
			onRetrieveDevices(data);
			break;
		case WebSocketEvent.onRetrieveHeartRates:
			onRetrieveHeartRates(data);
			break;
		case WebSocketEvent.onError:
			onError(data);
			break;
	}
}

function onError(error) {
	const message = (error.message || error.sqlMessage || 'An unexpected unknown error happened.');
	console.log('ERROR: ' + message);
	showAlert(AlertType.Danger, message, true);
}

function startWebSocket() {
	const serverURI =
		(window.location.protocol === 'https:' ? 'wss:' : 'ws:')+
		'//' +
		window.location.hostname +
		':' +
		window.location.port +
		'/';
	socket = new WebSocket(serverURI);
	socket.onopen = function() {
		showAlert(
			AlertType.Warning,
			'Real-Time connection to server opened. Waiting for a response...', true
		);
		socket.send(createPayload(WebSocketEvent.onConnection));
	}
	socket.onclose = function() {
		addDeviceButtonElement.disabled = true;
		removeDeviceButtonElement.disabled = true;
		console.log('WARNING: ' + 'Disconnected from Real-Time server! Retrying to connect...');
		showAlert(
			AlertType.Warning,'Disconnected from Real-Time server! Retrying to connect...', true
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

deviceSelectElement.addEventListener('change', function() {
	selectedDeviceId = parseInt(deviceSelectElement.value);
	removeDeviceButtonElement.innerHTML = 'Remove ' + getSelectedDevice().name;
	removeDeviceButtonElement.disabled = false;
	heartRateElement.innerHTML = '0';
	heartRateEmitTimeElement.innerHTML = '';
	setDataTableText(
		'Getting heart rates data of ' + getSelectedDevice().name + '...'
	);
	socket.send(createPayload(WebSocketEvent.onRequestHeartRates, selectedDeviceId));
});

function main() {
	setInterval(function() {
		const timeDiff = new Date().getTime() - lastPulseReceived.getTime();
		if (timeDiff > 3000) {
			heartRateElement.innerHTML = '0';
			heartRateEmitTimeElement.innerHTML = '';
		}
	}, 1000);
	setDataTableText('Please select a device first.');
	showAlert(
		AlertType.Warning,'Establishing connection to Real-Time server via WebSocket...', true
	);
	startWebSocket();
}
