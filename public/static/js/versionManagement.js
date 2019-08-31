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

const LOCAL_PULSE_KEYS = [];
let CURRENT_APP_VERSION = null;

async function isRequireUpgrade() {
	try {
		CURRENT_APP_VERSION = await getLocal('app-version');
		const localKeys = await getLocalKeys();
		for (const localKey of localKeys) {
			if (localKey.substr(0, 6) === 'pulse-') {
				LOCAL_PULSE_KEYS.push(localKey);
			}
		}
		if (CURRENT_APP_VERSION === null) {
			CURRENT_APP_VERSION = hasGarbageMemory() ? '1.0.0' : APP_VERSION;
		}
		printVersion();
		return CURRENT_APP_VERSION !== APP_VERSION;
	} catch (error) {
		throw error;
	}
}

function hasGarbageMemory() {
	return LOCAL_PULSE_KEYS.length > 0;
}

function printVersion() {
	let appInfo = 'Real-Time Heart Rate version ' + CURRENT_APP_VERSION + '.';
	if (CURRENT_APP_VERSION !== APP_VERSION) {
		appInfo = appInfo.concat(' Needs to be upgraded to version ' + APP_VERSION + '.');
	}
	appInfoElement.innerHTML = appInfo;
}

function askToUpgrade() {
	showAlert(
		AlertType.Warning,
		'<b>Application needs to be upgraded</b></br>' +
			'This application is outdated and will not run until it has been upgraded. Please upgrade the application now.</br></br>' +
			'<button type="button" class="btn btn-primary btn-sm" onclick="confirmUpgrade()">Upgrade Application</button>',
		true
	);
}

function askToCleanUp() {
	showAlert(
		AlertType.Secondary,
		'<b>Clean up unused old data</b></br>' +
			'This application has been upgraded; but it leaves unused old data in your browser. You may clean it up to save disk space.</br></br>' +
			'<button type="button" class="btn btn-primary btn-sm" onclick="confirmCleanUp()">Clean Up Old Data</button>',
		true
	);
}

async function confirmUpgrade() {
	if (confirm('This application will be upgraded. You cannot rollback changes.\n\nPress OK to upgrade.')) {
		await doUpgrade();
	}
}

async function confirmCleanUp() {
	if (confirm('You will clean up unused old data. You cannot rollback changes.\n\nPress OK to clean up.')) {
		await doCleanUp();
	}
}

async function doUpgrade() {
	try {
		const upgradeList = [];
		let upgrade = false;
		for (const version of VERSION_LIST) {
			if (upgrade) {
				upgradeList.push(version);
			}
			if (version === CURRENT_APP_VERSION) {
				upgrade = true;
			}
			if (version === APP_VERSION) {
				upgrade = false;
			}
		}
		showAlert(
			AlertType.Info,
			'<b>Application upgrade is in process...</b></br>' +
				'Please do not exit or refresh web browser until the process is finished. Also make sure your internet access is always active. Otherwise upgrade may failed.',
			true
		);
		for (const targetVersion of upgradeList) {
			console.log('INFO: Upgrading application to version ' + targetVersion + '.');
			switch (targetVersion) {
				case VERSION_LIST[0]:
					// Are you kidding?
					// You're trying to upgrade to the first version.
					break;
				case VERSION_LIST[1]:
					await upgradeToVersion2();
					break;
			}
			console.log('INFO: Successfully upgraded application to version ' + targetVersion + '.');
		}
		showAlert(
			AlertType.Success,
			'<b>Application has been successfully upgraded</b></br>' +
				'Please refresh this application to enjoy the new version.</br></br>' +
				'<button type="button" class="btn btn-primary btn-sm" onclick="window.location.reload()">Refresh Application</button>',
			true
		);
	} catch (error) {
		showAlert(AlertType.Danger, '<b>Failed to upgrade application</b></br>' + error.message, true);
		console.log('ERROR: ' + error.message);
	}
}

async function upgradeToVersion2() {
	const targetVersion = VERSION_LIST[1];
	try {
		const localPulses = [];
		let allIndex = 0;
		for (const localPulseKey of LOCAL_PULSE_KEYS) {
			const localPulseIndex = Math.floor(allIndex / 100);
			if (allIndex % 100 === 0) {
				localPulses.push([]);
			}
			const localPulse = await getLocal(localPulseKey);
			const arrivedAt = localPulse.receivedAt.getTime();
			// const localOffset = -1 * localPulse.receivedAt.getTimezoneOffset() * 60000;
			// const timestamp = new Date(arrivedAt + localOffset).getTime();
			localPulses[localPulseIndex].push({
				old_id: localPulse.pulse.id,
				arrived_at: arrivedAt,
			});
			allIndex++;
		}
		await initialiseSession();
		const serverURI =
			window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/client-upgrade';
		const response = {
			success: true,
			message: '',
		};
		for (const data of localPulses) {
			const result = await $.ajax({
				url: serverURI,
				type: 'POST',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify({
					currentVersion: CURRENT_APP_VERSION,
					targetVersion,
					sessionId: SESSION_IDENTIFIER,
					data,
				}),
			});
			const { success, message } = result;
			if (!success) {
				response.success = success;
				response.message = message;
			}
		}
		if (response.success) {
			await putLocal('app-version', targetVersion);
		} else {
			throw new Error(response.message);
		}
	} catch (error) {
		if (!error.message) {
			const isXHR = error.readyState === 4 && error.responseJSON;
			error.message = isXHR ? error.responseJSON.message : 'Unknown error occured.';
			if (!isXHR) {
				console.error(error);
			}
		}
		throw error;
	}
}

async function doCleanUp() {
	showAlert(
		AlertType.Info,
		'<b>Clean up is in process...</b></br>' +
			'Please do not exit or refresh web browser until the process is finished. Otherwise clean up may failed.',
		true
	);
	try {
		for (const localPulseKey of LOCAL_PULSE_KEYS) {
			await deleteLocal(localPulseKey);
		}
		console.log('INFO: Successfully cleaned up old data.');
		showAlert(
			AlertType.Success,
			'<b>Old data has been cleaned up</b></br>' + 'You may continue using this application as usual.',
			true
		);
	} catch (error) {
		showAlert(AlertType.Danger, '<b>Failed to clean up old data</b></br>' + error.message, true);
		console.log('ERROR: ' + error.message);
	}
}
