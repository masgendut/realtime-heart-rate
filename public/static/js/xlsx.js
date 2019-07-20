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

const WorkBookFileFormat = {
	xlsx: '.xlsx',
	xlsb: '.xlsb',
	xls: '.xls',
	csv: '.csv',
	ods: '.ods',
	fods: '.fods',
	html: '.html'
};

const workbookFileName = 'heart-rates-'.concat((new Date()).getTime().toString());

function createObject(pulse, emittedAt, receivedAt, transportDelay) {
	function parseTransportDelay() {
		const delay = parseFloat(transportDelay);
		return isNaN(delay) ? 0 : delay;
	}
	return { pulse, emittedAt,
		receivedAt: receivedAt === null ? 'N/A' : receivedAt,
		transportDelay: transportDelay === null ? 0 : parseTransportDelay()
	};
}

function getRowObjects() {
	const objects = [];
	objects.push(createObject(
		'Heart Rate',
		'Emitted At',
		'Received At',
		'Transport Delay'
	));
	let totalTransport = 0;
	const rows = savedRawPulses;
	for (const row of rows) {
		totalTransport += row[3]
		objects.push(createObject(row[0], row[1], row[2], row[3]));
	}
	objects.push(createObject('Total Transport', '', '', totalTransport));
	objects.push(createObject('Average Transport', '', '', totalTransport / rows.length));
	return objects;
}

function createWorkSheet() {
	return XLSX.utils.json_to_sheet(getRowObjects(), {
		header: [
			'pulse',
			'emittedAt',
			'receivedAt',
			'transportDelay'
		],
		skipHeader: true,
		cellDates: true
	});
}

function createWorkBook() {
	return XLSX.utils.book_new();
}

function processWorkbook(format) {
	const device = getSelectedDevice();
	const workbook = createWorkBook();
	XLSX.utils.book_append_sheet(workbook, createWorkSheet(), device.name);
	XLSX.writeFile(workbook, workbookFileName.concat(format));
}

function downloadWorkbook(format) {
	function onDownloadError(message) {
		showAlert(AlertType.Danger, message);
		createToast(ToastType.Error, message, 'Download Error');
	}
	if (selectedDeviceID === null) {
		onDownloadError('Please select a device first before download data.');
		return;
	}
	if (format === void 0) {
		onDownloadError('Workbook format is not defined.');
		return;
	}
	format = format.toLowerCase();
	switch (format) {
		case WorkBookFileFormat.xlsx: processWorkbook(format); break;
		case WorkBookFileFormat.xlsb: processWorkbook(format); break;
		case WorkBookFileFormat.xls: processWorkbook(format); break;
		case WorkBookFileFormat.csv: processWorkbook(format); break;
		case WorkBookFileFormat.ods: processWorkbook(format); break;
		case WorkBookFileFormat.fods: processWorkbook(format); break;
		case WorkBookFileFormat.html: processWorkbook(format); break;
		default: onDownloadError('Workbook format "' + format +'" is unknown.');
	}
}
