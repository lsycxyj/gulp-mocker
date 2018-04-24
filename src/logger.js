const log = require('fancy-log');
const _ = require('lodash');
const { isFunction } = _;

const LEVEL_INFO = 'info';
const LEVEL_WARN = 'warn';
const LEVEL_ERROR = 'error';
const LEVEL_NONE = 'none';

const levels = [LEVEL_INFO, LEVEL_WARN, LEVEL_ERROR, LEVEL_NONE];
const LEVEL_MAP = {};

for (let i = 0; i < levels.length; i++) {
    LEVEL_MAP[levels[i]] = i;
}

let curLevel = levels[0];

const exportMod = {
    LEVEL_INFO,
    LEVEL_WARN,
    LEVEL_ERROR,
    LEVEL_NONE,

    setLevel(level) {
        if (LEVEL_MAP.hasOwnProperty(level)) {
            curLevel = level;
        } else {
            console.error(`Level ${level} doesn't exist.`);
        }
    },
};

for (const l of levels) {
    if (isFunction(log[l])) {
        exportMod[l] = function () {
            if (LEVEL_MAP[l] >= LEVEL_MAP[curLevel]) {
                log[l].apply(log, arguments);
            }
        };
    }
}

module.exports = exportMod;
