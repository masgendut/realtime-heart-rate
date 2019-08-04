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
import {Application, NextFunction, Request, RequestHandler, Response} from "express-serve-static-core";
import handleAsync from "express-async-handler";

const mime: { [k: string]: string } = {
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

export function favicon(filename: string, pattern: RegExp = /\/favicon\.(png|ico)$/) {
    filename = path.resolve(filename);
    return function (request: Request, response: Response, next: NextFunction) {
        if (pattern.test(request.url)) {
            const ext = path.extname(filename);
            response.set('Content-Type', mime[ext]);
            fs.createReadStream(filename).pipe(response);
        } else next();
    };
}

function addRoute(
    app: Application,
    method: HTTP_METHOD,
    route: string,
    isRequireHTTPS: boolean,
    isAsyncHandler: boolean,
    handler: RequestHandler
) {
    const _handler = isAsyncHandler ? handleAsync(handler) : handler;
    isRequireHTTPS
        ? app[method](route, requireHTTPS, _handler)
        : app[method](route, _handler);
}

export const router = {
    use(app: Application) {
        return {
            get(route: string, isRequireHTTPS: boolean = false) {
                return {
                    handle(handler: RequestHandler, isAsyncHandler = true) {
                        addRoute(app, HTTP_METHOD.GET, route, isRequireHTTPS, isAsyncHandler, handler);
                    }
                }
            },
            post(route: string, isRequireHTTPS: boolean = false) {
                return {
                    handle(handler: RequestHandler, isAsyncHandler = true) {
                        addRoute(app, HTTP_METHOD.POST, route, isRequireHTTPS, isAsyncHandler, handler);
                    }
                }
            },
            put(route: string, isRequireHTTPS: boolean = false) {
                return {
                    handle(handler: RequestHandler, isAsyncHandler = true) {
                        addRoute(app, HTTP_METHOD.PUT, route, isRequireHTTPS, isAsyncHandler, handler);
                    }
                }
            },
            patch(route: string, isRequireHTTPS: boolean = false) {
                return {
                    handle(handler: RequestHandler, isAsyncHandler = true) {
                        addRoute(app, HTTP_METHOD.PATCH, route, isRequireHTTPS, isAsyncHandler, handler);
                    }
                }
            },
            delete(route: string, isRequireHTTPS: boolean = false) {
                return {
                    handle(handler: RequestHandler, isAsyncHandler = true) {
                        addRoute(app, HTTP_METHOD.DELETE, route, isRequireHTTPS, isAsyncHandler, handler);
                    }
                }
            },
        }
    }
}

export function requireHTTPS(request: Request, response: Response, next: NextFunction) {
    const schema: string = ((request.headers['x-forwarded-proto'] as string) || '').toLowerCase();
    request.headers.host && request.headers.host.indexOf('localhost') < 0 && schema !== 'https'
        ? response.redirect('https://' + request.headers.host + request.originalUrl)
        : next();
}

export function notFound(request: Request, response: Response) {
    response.status(404).json({
        success: false,
        code: 404,
        message: 'The page you are looking for is not found'
    });
}

export default { favicon, router, requireHTTPS, notFound };


enum HTTP_METHOD {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    PATCH = 'patch',
    DELETE = 'delete'
}
