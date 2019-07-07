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

function main() {
	setInterval(function() {
		const timeDiff = new Date().getTime() - lastPulseReceived.getTime();
		if (timeDiff > 3000) {
			heartRateElement.innerHTML = '0';
			heartRateEmitTimeElement.innerHTML = '';
			if (USE_CHART === true) {
				pushChartData(0, 0);
			}
		}
	}, 1000);
	setDataTableText('Please select a device first.');
	if (USE_CHART === true) {
		initialiseChart();
	}
	createToast(ToastType.Warning, 'Establishing connection to Real-Time server via WebSocket...');
	startWebSocket();
}

(function() {
	try {
		eval('async () => {}');
		main();
	} catch (error) {
		if (error instanceof SyntaxError) {
			showAlert(AlertType.Danger,
				'Your browser does not support this website. Please update to more modern browser for this website to run.',
				true);
		} else {
			showAlert(AlertType.Danger, error.message, true);
			console.error(error);
		}
	}
})();