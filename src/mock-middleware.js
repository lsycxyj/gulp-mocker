const fs = require('fs');
const path = require('path');
const url = require('url');
const decache = require('decache');
const isStream = require('is-stream');
const isBuffer = require('is-buffer');
const Mock = require('mockjs');
const glob = require('glob');
const mime = require('mime');
const pathToRegexp = require('path-to-regexp');
const log = require('./logger');
const _ = require('lodash');
const c2k = require('koa-connect');
const proxyMiddleware = require('http-proxy-middleware');

const {
    FALLBACK_MOCK,
    FALLBACK_PROXY,

    MOCK_TYPE_NORMAL,
    MOCK_TYPE_MOCKJS,
} = require('./const');
const helpers = require('./helpers');

const { isFunction, isObject, isString, isArray } = _;

function noop() {
}

module.exports = function (opts, { watchers }) {
    const {
        jsonpParamName,
        mockConfigName,
        mockExtOrder,
        mockPath,
        fallback,
        fallbackRules,
        proxies,
        watchMockConfig,
        rewrites,
    } = opts;

    let configMap;
    const proxyMiddlewares = makeProxyMiddlewares();
    const rules = {
        emptyBody({ ctx }) {
            return !ctx.body;
        },
        status404: makeStatusRule(404),
        status500: makeStatusRule(500),
    };

    function makeProxyMiddlewares() {
        const ret = [];

        for (const proxy of proxies) {
            const { source, context, options } = proxy;
            if (source && (context || options)) {
                const args = [];
                if (context) {
                    args.push(context);
                }
                if (options) {
                    args.push(options);
                }

                const item = {
                    source,
                    regex: source instanceof RegExp ? source : pathToRegexp(source),
                    middleware: c2k(proxyMiddleware.apply(this, args)),
                };
                ret.push(item);
            }
        }

        return ret;
    }

    function getMockRootAbsPath() {
        return path.resolve(mockPath);
    }

    function getAccessFilePath(accessURLPath) {
        const rootPath = getMockRootAbsPath();
        const filePath = path.normalize(path.join(rootPath, accessURLPath));
        return filePath;
    }

    function collectConfig() {
        configMap = new Map();

        const list = glob.sync(path.join(path.resolve(mockPath), `**/${mockConfigName}`));

        const rootPath = getMockRootAbsPath();

        for (const item of list) {
            const filePath = path.resolve(item);
            const folderPath = path.dirname(filePath);
            let p = folderPath;
            if (p.indexOf(rootPath) === 0) {
                p = path.relative(rootPath, p);
            }

            try {
                configMap.set(p, require(filePath));
                decache(filePath);
            } catch (e) {
                log.error(`Config file parsing error: ${filePath}. This config will be ignored.`);
                log.error(e);
            }
        }
    }

    function mergeConfig(accessURLPath) {
        const filePath = getAccessFilePath(accessURLPath);
        const rootPath = getMockRootAbsPath();
        const folderPath = path.dirname(filePath);
        const fullKey = path.relative(rootPath, folderPath);
        const parts = fullKey.split(path.sep);

        const resultConfig = {};
        for (let i = 0; i <= parts.length; i++) {
            const config = configMap.get(parts.slice(0, i).join(path.sep));
            if (config) {
                Object.assign(resultConfig, config);
            }
        }

        return resultConfig;
    }

    function tryFile(accessPath) {
        let ret = null;
        for (const ext of mockExtOrder) {
            const testFilePath = accessPath + ext;
            if (fs.existsSync(testFilePath) && !fs.statSync(testFilePath).isDirectory()) {
                ret = {
                    filePath: testFilePath,
                    ext,
                };
                break;
            }
        }
        return ret;
    }

    function doFilterRewrites(ctx) {
        if (isArray(rewrites)) {
            for (const rule of rewrites) {
                const { url } = ctx;
                const { from, to } = rule;

                let reg = from;
                const keys = [];

                if (isString(from)) {
                    reg = pathToRegexp(reg, keys);
                }

                const exec = reg.exec(url);

                if (exec) {
                    if (isString(to)) {
                        ctx.url = to;
                    } else if (isFunction(to)) {
                        ctx.url = to({
                            ctx,
                            exec,
                            keys,
                        });
                    }
                    break;
                }
            }
        }
    }

    async function doFilterConfig(ctx, resResult) {
        const { req, res, path: reqPath } = ctx;
        const { url: reqURL } = req;
        let ret = resResult;

        const config = mergeConfig(reqPath);
        const {
            wrapper,
            wrapperContentPlaceHolder = '{{!--WrapperContent--}}',
            mockType,
            passThroughProxy,
        } = config;

        // Remove response and pass through
        if (passThroughProxy === true) {
            ret = null;
            ctx.body = ret;
        } else {
            let statusCode = null;
            let contentType = null;

            // Response directly if it's a stream or a buffer
            if (isStream(resResult) || isBuffer(resResult)) {
                // Do nothing
                // ctx.body = resResult;
            } else if (isObject(resResult)) {
                switch (mockType) {
                    case MOCK_TYPE_NORMAL:
                        // Do nothing
                        break;
                    case MOCK_TYPE_MOCKJS:
                        ret = Mock.mock(resResult);
                        break;
                }

                if (isFunction(wrapper)) {
                    /**
                     * Dynamic wrapper
                     * @returns {Object}:
                     *      body {*}: The value will be set as the koa's body of ctx
                     *      contentType {String}: Optional. The value will be used as content type if it's set.
                     *      status {Number}: Optional. Response status code.
                     */
                    let retWrapper = wrapper({ ctx, resResult, helpers });
                    if (isFunction(retWrapper.then)) {
                        try {
                            retWrapper = await retWrapper;
                        } catch (e) {
                            log.error(`Wrapper process failed: ${reqURL}`);
                            log.error(e);
                            retWrapper = null;
                        }
                    }

                    if (retWrapper) {
                        const { body: retBody, contentType: retContentType, status } = retWrapper;
                        if (retBody) {
                            ret = retBody;

                            if (retContentType) {
                                contentType = retContentType;
                            } else {
                                if (isString(ret)) {
                                    contentType = mime.getType('txt');
                                } else if (isObject(ret)) {
                                    contentType = mime.getType('json');
                                }
                            }

                            if (Number.isInteger(status)) {
                                statusCode = status;
                            }
                        }
                    }
                } else if (isObject(wrapper)) {
                    try {
                        ret = JSON.parse(JSON.stringify(wrapper)
                            .replace(`"${wrapperContentPlaceHolder}"`, JSON.stringify(resResult)));
                    } catch (e) {
                        log.error(`Wrapper process failed: ${reqURL}`);
                        log.error(e);
                        ret = null;
                    }
                }

                if (ret) {
                    ctx.body = ret;

                    if (contentType) {
                        ctx.set('Content-Type', contentType);
                    }

                    if (statusCode !== null) {
                        ctx.status = statusCode;
                    }
                }
            }
        }
        return ret;
    }

    function doFilterJSONP(ctx, resResult) {
        const { query } = ctx;
        let ret = resResult;

        if (jsonpParamName && query[jsonpParamName]) {
            const jsonpFunctionName = query[jsonpParamName];
            // Response directly if it's a stream or a buffer
            if (isStream(resResult) || isBuffer(resResult)) {
                // Do nothing
                // ctx.body = resResult;
            } else if (isObject(resResult)) {
                ret = `${jsonpFunctionName}(${JSON.stringify(resResult)});`;
                ctx.body = ret;
                ctx.set('Content-Type', mime.getType('js'));
            }
        }
        return ret;
    }

    function doFilterDelay(ctx, resResult) {
        return new Promise((resolve, reject) => {
            const { path: reqPath } = ctx;
            const config = mergeConfig(reqPath);
            const { delay } = config;
            if (delay <= 0) {
                resolve(resResult);
            } else {
                setTimeout(() => {
                    resolve(resResult);
                }, delay);
            }
        });
    }

    async function makeResponse(ctx, accessPath) {
        const fileInfo = tryFile(accessPath);
        let result = null;
        if (fileInfo) {
            const { filePath } = fileInfo;
            const ext = path.extname(filePath);
            const filename = path.basename(filePath);

            // Ignore config file
            if (mockConfigName !== filename) {
                let contentType = '';
                let statusCode = null;

                switch (ext) {
                    case '.js':
                    case '.json':
                        let ret = null;
                        try {
                            ret = require(filePath);
                            // Never cache
                            decache(filePath);
                        } catch (e) {
                            log.error(`Request file process error: ${accessPath}`);
                            log.error(e);
                            // reset
                            ret = null;
                        }

                        if (isFunction(ret)) {
                            ret = ret({ ctx, helpers });
                            if (isFunction(ret.then)) {
                                try {
                                    ret = await ret;
                                } catch (e) {
                                    log.error(`Request file process error: ${accessPath}`);
                                    log.error(e);
                                    // reset
                                    ret = null;
                                }
                            }

                            /**
                             * A response generated by js should return the following structure:
                             * @returns {Object}:
                             *      body {*}: The value will be set as the koa's body of ctx
                             *      contentType {String}: Optional. The value will be used as content type if it's set.
                             *      passThroughProxy {Boolean}: Optional. Request will pass through the proxy directly. Only available when the fallback is proxy and the proxy is available.
                             *      status {Number}: Optional. Response status code.
                             */
                            if (ret) {
                                const { body: retBody, contentType: retContentType, passThroughProxy, status } = ret;

                                if (passThroughProxy !== true) {
                                    if (retBody) {
                                        result = retBody;

                                        if (retContentType) {
                                            contentType = retContentType;
                                        } else {
                                            if (isString(result)) {
                                                contentType = mime.getType('txt');
                                            } else if (isObject(result)) {
                                                contentType = mime.getType('json');
                                            }
                                        }

                                        if (Number.isInteger(status)) {
                                            statusCode = status;
                                        }
                                    }
                                }
                            }
                        } else if (isObject(ret)) {
                            result = ret;
                        }
                        break;
                    default:
                        result = fs.createReadStream(filePath);
                        contentType = mime.getType(ext);
                        break;
                }

                if (result) {
                    ctx.body = result;

                    if (contentType) {
                        ctx.set('Content-Type', contentType);
                    }
                }

                if (statusCode !== null) {
                    ctx.status = statusCode;
                }
            }
        } else {
            log.error(`Request path dosen't exist: ${accessPath}`);
        }

        return result;
    }

    async function doMockResponse(ctx) {
        doFilterRewrites(ctx);

        const { path: reqPath } = ctx;
        const accessPath = getAccessFilePath(reqPath);
        let result = await makeResponse(ctx, accessPath);
        result = await doFilterConfig(ctx, result);
        result = doFilterJSONP(ctx, result);
        result = await doFilterDelay(ctx, result);
        return result;
    }

    function tryProxies(ctx) {
        return new Promise((resolve, reject) => {
            const { url: reqURL, res } = ctx;
            for (const item of proxyMiddlewares) {
                const { regex, middleware } = item;
                if (regex.test(reqURL)) {
                    res.end = function () {
                        resolve(ctx);
                    };
                    middleware(ctx, noop)
                        .catch(reject);
                    break;
                }
            }
        });
    }

    function makeStatusRule(code) {
        return function ({ ctx }) {
            return ctx.status === code;
        }
    }

    function isMatchFallbackRules(ctx) {
        let ret = false;
        if (isArray(fallbackRules)) {
            for (const rule of fallbackRules) {
                if (isFunction(rule)) {
                    ret = rule({ ctx });
                } else if (isString(rule)) {
                    const fn = rules[rule];
                    if (isFunction(fn)) {
                        ret = fn({ ctx });
                    } else {
                        /* istanbul ignore next */
                        log.error(`Fallback rule "${rule}" not found.`);
                    }
                }

                if (ret) {
                    break;
                }
            }
        }
        return ret;
    }

    collectConfig();

    // Watchers
    if (watchMockConfig && isArray(watchers) && mockConfigName) {
        log.info(`Watching mock config changes`);
        watchers.push(fs.watch(path.resolve(mockPath), {
            recursive: true,
        }, function (eventType, filename) {
            if (path.basename(filename) === mockConfigName) {
                log.info(`Mock config ${filename} changed.`);
                log.info(`Recollect config files.`);
                collectConfig();
            }
        }))
    }

    if (fallback) {
        log.info('Fallback enabled.');
        if (fallback === true || fallback === FALLBACK_PROXY) {
            log.info('Request will fallback to proxy server.');
        } else if (fallback === FALLBACK_MOCK) {
            // log.info('Request will fallback to mock server.');
        }
    }

    return async function (ctx, next) {
        if (fallback) {
            if (fallback === true || fallback === FALLBACK_PROXY) {
                await doMockResponse(ctx);
                if (isMatchFallbackRules(ctx)) {
                    await tryProxies(ctx);
                }
            } else if (fallback === FALLBACK_MOCK) {
                // TODO http proxy middleware will end response and there's no way to wait for it
                // await tryProxies(ctx);
                // if (isMatchFallbackRules(ctx)) {
                //     await doMockResponse(ctx);
                // }
            }
        } else {
            await doMockResponse(ctx);
        }
        await next();
    };
};
