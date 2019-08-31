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

const ToastType = {
	Information: 'info',
	Success: 'success',
	Warning: 'warning',
	Error: 'error',
};

if (typeof toastr !== 'undefined' && toastr) {
	toastr.options = {
		closeButton: true,
		debug: false,
		newestOnTop: false,
		progressBar: true,
		positionClass: 'toast-top-right',
		preventDuplicates: true,
		onclick: null,
		showDuration: 300,
		hideDuration: 1000,
		timeOut: 0,
		extendedTimeOut: 0,
		showEasing: 'swing',
		hideEasing: 'linear',
		maxOpened: 1,
	};
}

function createToast(type, message, title) {
	if (typeof toastr !== 'undefined' && toastr) {
		toastr.remove();
		toastr[type](message, title);
	}
}
