const fs = require('fs');
const path = require('path');
const url = require('url');
const glob = require('glob');
const _ = require('lodash');
const CWD = procss.cwd();

const { isFunction, isObject } = _;

const configMap = new Map();

function collectConfig(opts) {
    const { mockPath, mockConfigName } = opts;
}

function mergeConfig(configFilePath) {
}

module.exports = function (opts) {
    const {
        jsonpParamName,
        mockConfigName,
        mockExtOrder,
        mockPath,
    } = opts;

    collectConfig(opts);

    return async function (ctx, next) {
    };
};
