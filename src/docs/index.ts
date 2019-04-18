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


import SwaggerUI from 'swagger-ui-express';
import SwaggerDocument from './openapi.json';
import { Application } from "express-serve-static-core";
import {forceHTTPS} from "../helpers/express";

export function docs(app: Application, route: string = '/docs') {
    app.use(route, SwaggerUI.serve, SwaggerUI.setup(SwaggerDocument));
}

export default docs;
