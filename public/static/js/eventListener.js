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

document.querySelector('form').onkeypress = function(e) {
	e = e || event;
	const txtArea = /textarea/i.test((e.target || e.srcElement).tagName);
	return txtArea || (e.keyCode || e.which || e.charCode || 0) !== 13;
};
deviceSelectElement.addEventListener('change', function() {
	selectedDeviceID = parseInt(deviceSelectElement.value);
	heartRateElement.innerHTML = '0';
	heartRateEmitTimeElement.innerHTML = '';
	if (USE_CHART === true) {
		clearChartData();
	}
	removeDeviceButtonElement.disabled = false;
	removeDeviceButtonElement.innerHTML = 'Remove ' + getSelectedDevice().name;
	setDataTableText(
		'Getting heart rates data of ' + getSelectedDevice().name + '....'
	);
	const requestTime = (new Date()).getTime();
	let passedInterval = false;
	const interval = setInterval(function() {
		const intervalTime = (new Date()).getTime();
		if (areWaitingResponses[WebSocketEvent.onRetrieveHeartRates] === true) {
			if ((intervalTime - requestTime) >= 5000 && !passedInterval) {
				passedInterval = true;
				const message = 'The process to retrieve heart rate data of "' + getSelectedDevice().name + '" is taking longer than usual. This may be caused by larger data or slow network speed. Please be patient.';
				showAlert(AlertType.Warning, message, true);
				createToast(ToastType.Warning, message, 'Still retrieving...');
			}
		} else {
			if (passedInterval) {
				const message = 'Heart rate data of "' + getSelectedDevice().name + '" is successfully retrieved.';
				showAlert(AlertType.Info, message, true);
				createToast(ToastType.Information, message, 'Retrieve completed');
			}
			clearInterval(interval);
		}
	}, 1000);
	areWaitingResponses[WebSocketEvent.onRetrieveHeartRates] = true;
	socket.send(WebSocketEvent.onRequestHeartRates, selectedDeviceID);
})
addDeviceButtonElement.addEventListener('click', function(event) {
	event.preventDefault();
	addDeviceNameElement.value = '';
	addModalJQueryElement.modal('show');
});
removeDeviceButtonElement.addEventListener('click', function(event) {
	event.preventDefault();
	const device = getSelectedDevice();
	removeDeviceNameElement.innerHTML = device.name + ' [ID: ' + device.id + ']';
	removeModalJQueryElement.modal('show');
});;
if (changeChartButtonElement) {
	changeChartButtonElement.addEventListener('click', function() {
		if (USE_CHART === true) {
			switchChart();
		}
	});
}
xlsxDownloadButtonElement.addEventListener('click', function (event) {
	event.preventDefault();
	downloadWorkbook(WorkBookFileFormat.xlsx);
});
xlsbDownloadButtonElement.addEventListener('click', function (event) {
	event.preventDefault();
	downloadWorkbook(WorkBookFileFormat.xlsb);
});
xlsDownloadButtonElement.addEventListener('click', function (event) {
	event.preventDefault();
	downloadWorkbook(WorkBookFileFormat.xls);
});
csvDownloadButtonElement.addEventListener('click', function (event) {
	event.preventDefault();
	downloadWorkbook(WorkBookFileFormat.csv);
});
odsDownloadButtonElement.addEventListener('click', function (event) {
	event.preventDefault();
	downloadWorkbook(WorkBookFileFormat.ods);
});
fodsDownloadButtonElement.addEventListener('click', function (event) {
	event.preventDefault();
	downloadWorkbook(WorkBookFileFormat.fods);
});
htmlDownloadButtonElement.addEventListener('click', function (event) {
	event.preventDefault();
	downloadWorkbook(WorkBookFileFormat.html);
});
