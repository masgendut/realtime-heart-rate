/**
 * Copyright 2019, Danang Galuh Tegar Prasetyo & Mokhamad Mustaqim.
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

const storage = !!localforage ? localforage.createInstance({
	name: "realtime-heart-rate"
}) : null;

async function putLocal(key, value) {
	try {
		if (storage !== null) {
			await storage.setItem(key, value);
		}
		return value;
	} catch (error) {
		return value;
	}
}

async function getLocal(key) {
	try {
		return storage !== null ? await storage.getItem(key) : null;
	} catch (error) {
		return null;
	}
}

/**
 * Helper Functions for Offline Storage
 */

async function putLocalPulse(pulse, arrivedAt, transportDelay) {
	const key = 'pulse-' + pulse.id;
	const value = {
		pulse, arrivedAt, transportDelay
	};
	await putLocal(key, value);
}

async function getTransportDelayFromLocalPulse(pulse) {
	const key = 'pulse-' + pulse.id;
	const value = await getLocal(key);
	if (value === null) {
		return 'N/A';
	}
	if (pulse.id === value.pulse.id &&
		pulse.device_id === value.pulse.device_id &&
		pulse.pulse === value.pulse.pulse &&
		pulse.emitted_at === value.pulse.emitted_at &&
		pulse.created_at === value.pulse.created_at
	) {
		return value.transportDelay;
	} else {
		return 'N/A';
	}
}