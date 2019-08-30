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

const informationElement = document.querySelector('.information');
const deviceSelectElement = document.querySelector('.device-select');
const heartRateElement = document.querySelector('.heart-rate');
const heartRateEmitTimeElement = document.querySelector('.heart-rate-emit-time');
const changeChartButtonElement = document.querySelector('#change-chart-button');
const heartRateChartElement = document.querySelector('#heart-rate-chart');
const addDeviceButtonElement = document.querySelector('#add-device-button');
const removeDeviceButtonElement = document.querySelector('#remove-device-button');
/*
const xlsxDownloadButtonElement = document.querySelector('#xlsx-download-button');
const xlsbDownloadButtonElement = document.querySelector('#xlsb-download-button');
const xlsDownloadButtonElement = document.querySelector('#xls-download-button');
const csvDownloadButtonElement = document.querySelector('#csv-download-button');
const odsDownloadButtonElement = document.querySelector('#ods-download-button');
const fodsDownloadButtonElement = document.querySelector('#fods-download-button');
const htmlDownloadButtonElement = document.querySelector('#html-download-button');
*/
const appInfoElement = document.querySelector('#app-info');
const addDeviceNameElement = document.querySelector('#add-device-name');
const removeDeviceNameElement = document.querySelector('#remove-device-name');
const tableJQueryElement = $('.heart-rate-table');
const addModalJQueryElement = $('#add-modal');
const removeModalJQueryElement = $('#remove-modal');
