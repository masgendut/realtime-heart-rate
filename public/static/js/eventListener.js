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
	setDataTableText(
		'Getting heart rates data of ' + getSelectedDevice().name + '...'
	);
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