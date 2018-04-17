const fs = require('fs');
const path = require('path');
const url = require('url');
const decache = require('decache');
const isStream = require('is-stream');
const Mock = require('mockjs');
const glob = require('glob');
const log = require('fancy-log');
const _ = require('lodash');

const {
    FALLBACK_MOCK,
    FALLBACK_PROXY,

    MOCK_TYPE_NORMAL,
    MOCK_TYPE_MOCKJS,
} = require('./const');

const CWD = process.cwd();

const { isFunction, isObject } = _;

// TODO some helpful utils, like image generator
const utils = {
    Mock,
};

module.exports = function (opts) {
    const {
        jsonpParamName,
        mockConfigName,
        mockExtOrder,
        mockPath,
        fallback,
    } = opts;

    let configMap;

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

    collectConfig();

    return async function (ctx, next) {
        async function doFilterConfig(resResult) {
            const { req, res } = ctx;
            const { url: reqURL } = req;
            let ret = resResult;

            // Response directly if it's a stream
            if (!isStream(resResult)) {
                // Do nothing
                ctx.body = resResult;
            } else if (isObject(resResult)) {
                const config = mergeConfig(reqURL);
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
                    ret = wrapper({ ctx, resResult, utils });
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
                            .replace(wrapperContentPlaceHolder, JSON.stringify(resResult)));
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

        // TODO
        function doFilterJSONP(resResult) {
            const { req, res } = ctx;
            let ret = resResult;

            if (jsonpParamName) {
                // Response directly if it's a stream
                if (!isStream(resResult)) {
                    // Do nothing
                    ctx.body = resResult;
                } else if (isObject(resResult)) {
                    // TODO
                }
            }
            return ret;
        }

        async function makeResponse(accessPath) {
            const fileInfo = tryFile(accessPath);
            let result = null;
            if (fileInfo) {
                const { filePath } = fileInfo;
                const ext = path.extname(filePath);

                switch (ext) {
                    case '.js':
                    case '.json':
                        result = require(filePath);
                        // Never cache
                        decache(filePath);
                        break;
                    default:
                        result = fs.createReadStream(filePath);
                        break;
                }

                if (isFunction(result)) {
                    result = result({ ctx, utils });
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
            } else {
                log.error(`Request path dosen't exist: ${accessPath}`);
            }
            return result;
        }

        async function doResponse() {
            const { req, res } = ctx;
            const { url: reqURL } = req;
            const accessPath = getAccessFilePath(reqURL);
            let result = await makeResponse(accessPath);
            result = await doFilterConfig(result);
            result = doFilterJSONP(result);
        }

        await doResponse();

        if (fallback) {
            log.info('Fallback enabled.');
            if (fallback === true || FALLBACK_PROXY) {
                log.info('Any request will fallback to proxy server.');
            } else if (fallback === FALLBACK_MOCK) {
                // TODO
                log.info('Any request will fallback to mock server.');
            }
        }
    };
};
