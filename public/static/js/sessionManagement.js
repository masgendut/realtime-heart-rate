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

let SESSION_IDENTIFIER = null;

async function initialiseSession(forceInitialisation = false) {
	try {
		createToast(ToastType.Warning, 'Initialising session...')
		let session = await getLocalSession();
		if (session === null || forceInitialisation) {
			const serverURI = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/register-session';
			const result = await $.ajax({
				url: serverURI,
				type: 'POST',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify({ clientId: CLIENT_IDENTIFIER }),
			});
			session = result.data;
			await putLocalSession(session);
		}
		SESSION_IDENTIFIER = session._id;
	} catch (error) {
		createToast(ToastType.Error, error.message, 'Failed to initialise session');
	}
}
