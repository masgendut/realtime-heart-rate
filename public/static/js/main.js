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
const changeChartButtonElement = document.querySelector('#change-chart-button');
const heartRateChartElement = document.querySelector('#heart-rate-chart');
const tableJQueryElement = $('.heart-rate-table');
copyrightElement.innerHTML =
	'Copyright &copy; ' + new Date().getFullYear() + ' Mokhamad Mustaqim';

let chart = null;
let activeChart = 0;
let chartData = [];
let datatable = null;
let lastPulseReceived = new Date();
let devices = [];
let tableData = [];
let isTableDataReversed = false;
let selectedDeviceId = null;

function addNewOption(value, option) {
	return '<option value="' + value + '">' + option + '</option>';
}

function initialiseChart() {
	changeChartButtonElement.innerHTML = 'View Time Delay Chart';
	chartData = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
	chart = new Chart(heartRateChartElement, {
		type: 'line',
		data: {
			labels: ['', '', '', '', '', ''],
			datasets: [
				{
					label: 'heart rate',
					data: [0, 0, 0, 0, 0, 0],
					backgroundColor: 'rgba(255, 255, 255, 0)',
					borderColor: 'rgba(54, 162, 235, 1)',
					borderWidth: 1
				}
			]
		},
		options: {
			scales: {
				yAxes: [
					{
						ticks: {
							beginAtZero: true
						}
					}
				]
			}
		}
	});
	changeChartButtonElement.style.display = 'block';
}

function updateChart() {
	chart.data.datasets[0].data = chartData[activeChart];
	chart.update();
}

function switchChart() {
	activeChart = activeChart === 0 ? 1 : 0;
	changeChartButtonElement.innerHTML =
		activeChart === 0 ? 'View Time Delay Chart' : 'View Heart Rate Chart';
	if (activeChart === 0) {
		changeChartButtonElement.classList.add('btn-danger');
		changeChartButtonElement.classList.remove('btn-info');
	} else {
		changeChartButtonElement.classList.add('btn-info');
		changeChartButtonElement.classList.remove('btn-danger');
	}
	chart.data.datasets[0].label =
		activeChart === 0 ? 'heart rate' : 'seconds from device';
	chart.data.datasets[0].borderColor =
		activeChart === 0 ? 'rgba(54, 162, 235, 1)' : 'rgba(255, 99, 132, 1)';
	updateChart();
}

function pushChartData(heartRate, timeDelay) {
	for (let x = 0; x < 2; x++) {
		for (let y = 5; y > 0; y--) {
			chartData[x][y] = chartData[x][y - 1];
		}
	}
	chartData[0][0] = heartRate;
	chartData[1][0] = timeDelay;
	updateChart();
}

function clearChartData() {
	chartData = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
	updateChart();
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

function onConnection(message) {
	console.log(message);
	showAlert(AlertType.Success, message, true);
}

function onEmitHeartRate(pulse) {
	if (
		selectedDeviceId !== null &&
		parseInt(pulse.deviceId) === selectedDeviceId
	) {
		lastPulseReceived = new Date();
		pulse.emitted_at = new Date(pulse.emitted_at);
		pulse.created_at = new Date(pulse.created_at);
		const transportDelay =
			(lastPulseReceived.getTime() - pulse.emitted_at.getTime()) / 1000;
		heartRateElement.innerHTML = pulse.pulse;
		heartRateEmitTimeElement.innerHTML =
			transportDelay.toString() + ' seconds from device';
		pushChartData(pulse.pulse, transportDelay);
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
		setDataTableText(
			'There are no any heart rates data for ' +
				getSelectedDevice().name +
				'.'
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
			break;
	}
}

socket.on(WebSocketEvent.onConnection, onConnection);
socket.on(WebSocketEvent.onEmitHeartRate, onEmitHeartRate);
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
deviceSelectElement.addEventListener('change', function() {
	selectedDeviceId = parseInt(deviceSelectElement.value);
	heartRateElement.innerHTML = '0';
	heartRateEmitTimeElement.innerHTML = '';
	clearChartData();
	setDataTableText(
		'Getting heart rates data of ' + getSelectedDevice().name + '...'
	);
	socket.emit(
		WebSocketEvent.onRequestHeartRates,
		selectedDeviceId,
		onResponseEvent
	);
});
changeChartButtonElement.addEventListener('click', function() {
	switchChart();
});

function main() {
	setDataTableText('Please select a device first.');
	showAlert(
		AlertType.Warning,
		'Connecting to Real-Time server via Web Socket...'
	);
	initialiseChart();
	socket.emit(WebSocketEvent.onRequestDevices, onResponseEvent);
	setInterval(function() {
		const timeDiff = new Date().getTime() - lastPulseReceived.getTime();
		if (timeDiff > 3000) {
			heartRateElement.innerHTML = '0';
			heartRateEmitTimeElement.innerHTML = '';
			pushChartData(0, 0);
		}
	}, 1000);
}
