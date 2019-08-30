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
			CURRENT_APP_VERSION = LOCAL_PULSE_KEYS.length === 0 
				? APP_VERSION
				: '1.0.0';
		}
		printVersion();
		return CURRENT_APP_VERSION !== APP_VERSION;
	} catch (error) {
		throw error;
	}
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

async function confirmUpgrade() {
	if (confirm('This application will be upgraded. You cannot rollback changes.\n\nPress OK to upgrade.')) {
		doUpgrade();
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
		showAlert(
			AlertType.Danger,
			'<b>Failed to upgrade application</b></br>' + error.message,
			true
		);
		console.log('ERROR: ' + error.message);
	}
}

async function upgradeToVersion2() {
	const targetVersion = VERSION_LIST[1];
	try {
		const localPulses = [];
		for (const localPulseKey of LOCAL_PULSE_KEYS) {
			const localPulse = await getLocal(localPulseKey);
			localPulses.push({
				old_id: localPulse.pulse.id,
				arrived_at: new Date(localPulse.receivedAt).getTime()
			});
		}
		await initialiseSession();
		const serverURI = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/client-upgrade';
		const result = await $.ajax({
			url: serverURI,
			type: 'POST',
			dataType: 'json',
			contentType: "application/json",
			data: JSON.stringify({
				currentVersion: CURRENT_APP_VERSION,
				targetVersion,
				sessionId: SESSION_IDENTIFIER,
				data: localPulses
			}),
		});
		const { success, message } = result;
		if (success) {
			// for (const localPulseKey of LOCAL_PULSE_KEYS) {
			// 	await deleteLocal(localPulseKey);
			// }
		} else {
			throw new Error(message);
		}
	} catch (error) {
		if (!error.message) {
			const isXHR = error.readyState === 4 && error.responseJSON;
			error.message = isXHR
				? error.responseJSON.message
				: 'Unknown error occured.';
			if (!isXHR) {
				console.error(error);
			}
		}
		throw error;
	}
}
