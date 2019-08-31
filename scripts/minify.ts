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

import fs from 'fs';
import path from 'path';
import UglifyJS from 'uglify-es';

export async function minify() {
	const featureFilesLocation: fs.PathLike = path.join(__dirname, '..', 'public', 'static', 'js');
	const featureFiles: string[] = [
		'appVersion.js',
		'clientIdentifier.js',
		'publicVapidKey.js',
		'dateTime.js',
		'elements.js',
		'alertManipulation.js',
		'toastManipulation.js',
		'tableManipulation.js',
		'chartManipulation.js',
		'offlineStorage.js',
		'fileManagement.js',
		'sessionManagement.js',
		'versionManagement.js',
		'webSocket.js',
		'eventListener.js',
		'main.js',
	];

	const code: { [k: string]: string } = {};
	const options: UglifyJS.MinifyOptions = {
		toplevel: true,
		ie8: true,
		output: {
			beautify: false,
			shebang: false,
			preamble: `/**
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
 */`,
		},
	};

	for (const featureFile of featureFiles) {
		try {
			const featureFileLocation: fs.PathLike = path.join(featureFilesLocation, featureFile);
			if (fs.existsSync(featureFileLocation)) {
				code[featureFile] = fs.readFileSync(featureFileLocation, 'utf-8');
			}
		} catch (error) {
			console.log(error);
			process.exit(1);
		}
	}

	const result: UglifyJS.MinifyOutput = UglifyJS.minify(code, options);

	if (result.error) {
		console.log(result.error);
		process.exit(2);
	}

	const minifiedCode = result.code;
	fs.writeFileSync(path.join(featureFilesLocation, 'application.min.js'), minifiedCode, {
		encoding: 'utf-8',
	});

	console.log('Successfully minified client app.');
}
