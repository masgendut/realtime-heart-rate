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

import { migrateUp, migrateDown } from './migration';
import { minify } from './minify';
import { upgradeVersion } from './upgradeVersion';

const args = process.argv.slice(2);
const silentRun = args[1] === 'silent';
if (!silentRun) {
	console.clear();
	console.log('Real-Time Heart Rate');
	console.log('--------------------');
}
if (args.length === 0 || !args[0]) {
	console.log('No command defined to run. Please run with command:');
	console.log('ts-node runner.ts <command>');
} else {
	switch (args[0]) {
		case 'migrateUp':
			migrateUp()
				.then(() => {
					exit();
				})
				.catch(() => {
					exit(1);
				});
			break;
		case 'migrateDown':
			migrateDown()
				.then(() => {
					exit();
				})
				.catch(() => {
					exit(1);
				});
			break;
		case 'minify':
			minify()
				.then(() => {
					exit();
				})
				.catch(() => {
					exit(1);
				});
			break;
		case 'upgradeVersion':
			upgradeVersion()
				.then(() => {
					exit();
				})
				.catch(() => {
					exit(1);
				});
			break;
		default:
			console.log('Command "' + args[0] + '" is unknown.');
			exit(2);
	}
}

function exit(code: number = 0) {
	if (!silentRun) {
		console.log('--------------------');
		if (typeof process.stdin !== 'undefined') {
			console.log('Press any key to exit...');
			// @ts-ignore
			process.stdin.setRawMode(true);
			// @ts-ignore
			process.stdin.resume();
			// @ts-ignore
			process.stdin.on('data', process.exit.bind(process, code));
		}
	}
}
