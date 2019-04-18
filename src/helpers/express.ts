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

import {NextFunction, Request, Response} from "express-serve-static-core";

export function requireHTTPS(req: Request, res: Response ,next: NextFunction) {
    const schema: string = ((req.headers['x-forwarded-proto'] as string) || '').toLowerCase();
    req.headers.host && req.headers.host.indexOf('localhost') < 0 && schema !== 'https'
        ? res.redirect('https://' + req.headers.host + req.originalUrl)
        : next();
}

