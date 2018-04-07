const fs = require('fs');
const path = require('path');
const url = require('url');
const glob = require('glob');
const log = require('fancy-log');
const _ = require('lodash');

const { FALLBACK_MOCK, FALLBACK_PROXY } = require('./const');

const CWD = process.cwd();

const { isFunction, isObject } = _;

module.exports = function (opts) {
    const {
        jsonpParamName,
        mockConfigName,
        mockExtOrder,
        mockPath,
        fallback,
    } = opts;

    const configMap = new Map();

    function collectConfig(opts) {
        const { mockPath, mockConfigName } = opts;
    }

    function mergeConfig(configFilePath) {
    }

    collectConfig(opts);

    return async function (ctx, next) {
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
