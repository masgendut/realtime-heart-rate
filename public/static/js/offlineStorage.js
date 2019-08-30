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

const storage = !!localforage
	? localforage.createInstance({
			name: 'realtime-heart-rate',
	  })
	: null;

async function getLocalKeys() {
	try {
		if (storage !== null) {
			return storage.keys();
		}
	} catch (error) {
		return [];
	}
}

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

async function deleteLocal(key) {
	try {
		if (storage !== null) {
			await storage.removeItem(key);
			return true;
		}
		return false;
	} catch (error) {
		return false;
	}
}

/**
 * Helper Functions for Local Session
 */

async function putLocalSession(session) {
	await putLocal('session', session);
	return session;
}

async function getLocalSession() {
	const session = await getLocal('session');
	if (session === null) {
		return null;
	}
	if (!session._id) {
		await deleteLocal('session');
		return null;
	}
	return session;
}
