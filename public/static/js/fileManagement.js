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

const AvailableFileFormat = {
	XLSX: '.xlsx',
	XLS: '.xls',
	CSV: '.csv',
	ODS: '.ods',
};

function requestFile(fileFormat) {
	if (selectedDeviceID === null) {
		createToast(ToastType.Error, 'Please select a device first to download data.');
		return;
	}
	const requestedFileID = 'heart-rates';
	const data = {
		deviceID: selectedDeviceID,
	};
	socket.send(WebSocketEvent.onRequestFile, {
		fileFormat,
		requestedFileID,
		data,
	});
}
