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

const copyrightElement = document.querySelector('.copyright');
const informationElement = document.querySelector('.information');
const deviceSelectElement = document.querySelector('.device-select');
const heartRateElement = document.querySelector('.heart-rate');
const heartRateEmitTimeElement = document.querySelector(
	'.heart-rate-emit-time'
);
const tableBodyElement = document.querySelector('.heart-rate-table tbody');
copyrightElement.innerHTML =
	'Copyright &copy; ' + new Date().getFullYear() + ' Mokhamad Mustaqim';

let lastPulseReceived = new Date();
let devices = [];
let selectedDeviceId = null;

function addNewOption(value, option) {
	return '<option value="' + value + '">' + option + '</option>';
}

function addNewRow() {
	let rowHTML = '<tr>';
	for (let index = 0; index < arguments.length; index++) {
		rowHTML = rowHTML.concat('<td>' + arguments[index] + '</td>');
	}
	return rowHTML.concat('</tr>');
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
const WebSocketEvent = {
	onConnection: 'onConnection',
	onEmitHeartRate: 'onEmitHeartRate',
	onRequestDevices: 'onRequestDevices',
	onRetrieveDevices: 'onRetrieveDevices',
	onRequestHeartRates: 'onRequestHeartRates',
	onRetrieveHeartRates: 'onRetrieveHeartRates',
	onError: 'onError'
};

const serverURI =
	window.location.protocol +
	'//' +
	window.location.hostname +
	':' +
	window.location.port +
	'/';

const socket = io(serverURI, {
	autoConnect: true,
	transports: ['websocket']
});

socket.on('error', function(message) {
	console.log(message ? message : 'An unknown error happen on Web Socket.');
	showAlert(
		AlertType.Danger,
		message ? message : 'An unknown error happen on Web Socket.',
		true
	);
});

socket.on('connect_failed', function() {
	console.log('Failed to connect to Web Socket server!');
	showAlert(
		AlertType.Danger,
		'Failed to connect to Web Socket server!',
		true
	);
});

socket.on('disconnect', function() {
	console.log('Disconnected from Web Socket server!');
	showAlert(AlertType.Warning, 'Disconnected from Web Socket server!', true);
});

socket.on(WebSocketEvent.onConnection, function(message) {
	console.log(message);
	showAlert(AlertType.Success, message, true);
});

socket.on(WebSocketEvent.onEmitHeartRate, function(pulse) {
	if (
		selectedDeviceId !== null &&
		parseInt(pulse.deviceId) === selectedDeviceId
	) {
		lastPulseReceived = new Date();
		pulse.emitted_at = new Date(pulse.emitted_at);
		pulse.created_at = new Date(pulse.created_at);
		const secondsFromDevice =
			(lastPulseReceived.getTime() - pulse.emitted_at.getTime()) / 1000;
		heartRateElement.innerHTML = pulse.pulse;
		heartRateEmitTimeElement.innerHTML =
			secondsFromDevice.toString() + ' seconds from device';
		tableBodyElement.innerHTML =
			addNewRow(
				pulse.pulse,
				moment(pulse.emitted_at).format('lll'),
				secondsFromDevice.toString() + ' s'
			) + tableBodyElement.innerHTML;
	}
});

function onRetrieveDevices(_devices) {
	if (!Array.isArray(_devices)) {
		console.log(
			'Data on Web Socket "onRetrieveDevices" event is not an array. Parsing failed!'
		);
		return;
	}
	devices = _devices;
	let deviceSelectHTML = '';
	for (const device of _devices) {
		device.id = parseInt(device.id);
		deviceSelectHTML =
			deviceSelectHTML + addNewOption(device.id, device.name);
	}
	deviceSelectElement.innerHTML =
		'<option selected disabled>Select a device...</option>' +
		deviceSelectHTML;
}

function onRetrieveHeartRates(pulses) {
	if (!Array.isArray(pulses)) {
		console.log(
			'Data on Web Socket "onRetrieveHeartRates" event is not an array. Parsing failed!'
		);
		return;
	}
	if (pulses.length === 0) {
		tableBodyElement.innerHTML =
			'<tr><td colspan="3">There are no any heart rates data for ' +
			getSelectedDevice().name +
			'.</td></tr>';
		return;
	}
	let tableBodyHTML = '';
	for (const pulse of pulses) {
		pulse.emitted_at = new Date(pulse.emitted_at);
		tableBodyHTML =
			addNewRow(pulse.pulse, moment(pulse.emitted_at).format('lll'), '') +
			tableBodyHTML;
	}
	tableBodyElement.innerHTML = tableBodyHTML;
}

function onError(error) {
	console.log('Web Socket Request ERROR: ' + error.message);
	showAlert(AlertType.Danger, error.message);
}

function onResponseEvent(event, ...args) {
	switch (event) {
		case WebSocketEvent.onError:
			onError(...args);
			break;
		case WebSocketEvent.onRetrieveDevices:
			onRetrieveDevices(...args);
			break;
		case WebSocketEvent.onRetrieveHeartRates:
			onRetrieveHeartRates(...args);
			generateTables();
			break;
	}
}

deviceSelectElement.addEventListener('change', function() {
	selectedDeviceId = parseInt(deviceSelectElement.value);
	heartRateElement.innerHTML = '0';
	heartRateEmitTimeElement.innerHTML = '';
	tableBodyElement.innerHTML =
		'<tr><td colspan="3">Getting heart rates data of ' +
		getSelectedDevice().name +
		'</td></tr>';
	socket.emit(
		WebSocketEvent.onRequestHeartRates,
		selectedDeviceId,
		onResponseEvent
	);
});

function main() {
	showAlert(
		AlertType.Warning,
		'Connecting to Real-Time server via Web Socket...'
	);
	socket.emit(WebSocketEvent.onRequestDevices, onResponseEvent);
	setInterval(function() {
		const timeDiff = new Date().getTime() - lastPulseReceived.getTime();
		if (timeDiff > 3000) {
			heartRateElement.innerHTML = '0';
			heartRateEmitTimeElement.innerHTML = '';
		}
	}, 1000);
}
