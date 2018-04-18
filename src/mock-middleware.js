const fs = require('fs');
const path = require('path');
const url = require('url');
const decache = require('decache');
const isStream = require('is-stream');
const Mock = require('mockjs');
const glob = require('glob');
const mime = require('mime');
const pathToRegexp = require('path-to-regexp');
const log = require('fancy-log');
const _ = require('lodash');
const c2k = require('koa-connect');
const proxyMiddleware = require('http-proxy-middleware');

const {
    FALLBACK_MOCK,
    FALLBACK_PROXY,

    MOCK_TYPE_NORMAL,
    MOCK_TYPE_MOCKJS,
} = require('./const');

const CWD = process.cwd();

const { isFunction, isObject, isString } = _;

// TODO some helpful utils, like image generator
const helpers = {
    Mock,
};

function noop() {}

module.exports = function (opts) {
    const {
        jsonpParamName,
        mockConfigName,
        mockExtOrder,
        mockPath,
        fallback,
        proxies,
    } = opts;

    let configMap;
    const logOnceMap = {};
    const proxyMiddlewares = makeProxyMiddlewares();

    function makeProxyMiddlewares() {
        const ret = [];

        for (const proxy of proxies) {
            const { source, context, options } = proxy;
            if (source && context && options) {
                const item = {
                    source,
                    regex: source instanceof RegExp ? source : pathToRegexp(source),
                    middleware: c2k(proxyMiddleware(context, options)),
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

    // TODO watch and recollect
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

            configMap.set(p, require(filePath));
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

    async function doFilterConfig(ctx, resResult) {
        const { req, res, path: reqPath } = ctx;
        const { url: reqURL } = req;
        let ret = resResult;

        // Response directly if it's a stream
        if (isStream(resResult)) {
            // Do nothing
            // ctx.body = resResult;
        } else if (isObject(resResult)) {
            const config = mergeConfig(reqPath);
            const {
                wrapper,
                wrapperContentPlaceHolder = '{{!--WrapperContent--}}',
                mockType
            } = config;

            switch (mockType) {
                case MOCK_TYPE_NORMAL:
                    // Do nothing
                    break;
                case MOCK_TYPE_MOCKJS:
                    ret = Mock.mock(resResult);
                    break;
            }

            if (isFunction(wrapper)) {
                ret = wrapper({ ctx, resResult, helpers });
                if (isFunction(ret.then)) {
                    try {
                        ret = await ret;
                    } catch (e) {
                        log.error(`Wrapper process failed: ${reqURL}`);
                        log.error(e);
                        ret = null;
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
            }
        }
        return ret;
    }

    function doFilterJSONP(ctx, resResult) {
        const { query } = ctx;
        let ret = resResult;

        if (jsonpParamName && query[jsonpParamName]) {
            const jsonpFunctionName = query[jsonpParamName];
            // Response directly if it's a stream
            if (isStream(resResult)) {
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
            let contentType = '';

            switch (ext) {
                case '.js':
                case '.json':
                    result = require(filePath);
                    // Never cache
                    decache(filePath);
                    if (isString(result)) {
                        contentType = mime.getType('txt');
                    } else if (isObject(result)) {
                        contentType = mime.getType('json');
                    }
                    break;
                default:
                    result = fs.createReadStream(filePath);
                    contentType = mime.getType(ext);
                    break;
            }

            if (isFunction(result)) {
                result = result({ ctx, helpers });
                if (isFunction(result.then)) {
                    try {
                        result = await result;
                    } catch (e) {
                        log.error(`Request file process error: ${accessPath}`);
                        log.error(e);
                        // reset
                        result = null;
                    }
                }
            }

            if (result) {
                ctx.body = result;

                if (contentType) {
                    ctx.set('Content-Type', contentType);
                }
            }
        } else {
            log.error(`Request path dosen't exist: ${accessPath}`);
        }

        return result;
    }

    async function doMockResponse(ctx) {
        const { path: reqPath } = ctx;
        const accessPath = getAccessFilePath(reqPath);
        let result = await makeResponse(ctx, accessPath);
        result = await doFilterConfig(ctx, result);
        result = doFilterJSONP(ctx, result);
        result = await doFilterDelay(ctx, result);
        return result;
    }

    async function tryProxies(ctx) {
        const { url: reqURL } = ctx;
        for (const item of proxyMiddlewares) {
            const { regex, middleware } = item;
            if (regex.test(reqURL)) {
                await middleware(ctx, noop);
                break;
            }
        }
    }

    collectConfig();

    return async function (ctx, next) {
        if (fallback) {
            log.info('Fallback enabled.');
            if (fallback === true || FALLBACK_PROXY) {
                await doMockResponse(ctx);
                if (!ctx.body) {
                    log.info('Request will fallback to proxy server.');
                    await tryProxies(ctx);
                }
            } else if (fallback === FALLBACK_MOCK) {
                await tryProxies(ctx);
                if (!ctx.body) {
                    log.info('Request will fallback to mock server.');
                    await doMockResponse(ctx);
                }
            }
        } else {
            await doMockResponse(ctx);
        }
    };
};
