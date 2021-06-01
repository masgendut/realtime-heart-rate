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

const USE_CHART = true;

let chart = null;
let activeChart = 0;
let chartData = [];

function initialiseChart() {
	changeChartButtonElement.innerHTML = 'Switch to Transport Delay Chart';
	chartData = [
		[0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0],
	];
	chart = new Chart(heartRateChartElement, {
		type: 'line',
		data: {
			labels: ['1', '2', '3', '4', '5', '6'],
			datasets: [
				{
					label: 'heart rate',
					data: [0, 0, 0, 0, 0, 0],
					backgroundColor: 'rgba(255, 255, 255, 0)',
					borderColor: 'rgba(54, 162, 235, 1)',
					borderWidth: 1,
				},
			],
		},
		options: {
			scales: {
				yAxes: [
					{
						ticks: {
							beginAtZero: true,
						},
						scaleLabel: {
							display: true,
							labelString: 'bpm',
						},
					},
				],
				xAxes: [
					{
						scaleLabel: {
							display: true,
							labelString: 'seconds ago',
						},
					},
				],
			},
		},
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
		activeChart === 0 ? 'Switch to Transport Delay Chart' : 'Switch to Heart Rate Chart';
	if (activeChart === 0) {
		changeChartButtonElement.classList.add('btn-danger');
		changeChartButtonElement.classList.remove('btn-info');
	} else {
		changeChartButtonElement.classList.add('btn-info');
		changeChartButtonElement.classList.remove('btn-danger');
	}
	chart.data.datasets[0].label = activeChart === 0 ? 'heart rate' : 'transport delay';
	chart.data.datasets[0].borderColor = activeChart === 0 ? 'rgba(54, 162, 235, 1)' : 'rgba(255, 99, 132, 1)';
	chart.options.scales.yAxes[0].scaleLabel.labelString = activeChart === 0 ? 'bpm' : 'seconds';
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
	chartData = [
		[0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0],
	];
	updateChart();
}
