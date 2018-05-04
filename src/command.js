const path = require('path');

const mod = require('./server');

const CWD = process.cwd();

module.exports = {
    exec(argv) {
        const opts = {};

        const configFilePath = argv.c || argv.config;

        if (configFilePath) {
            const configFileJson = require(path.resolve(CWD, configFilePath));
            Object.assign(opts, configFileJson);
        }

        const mockPath = argv.r || argv.mockPath;
        const port = argv.p || argv.port;

        if (mockPath) {
            opts.mockPath = mockPath;
        }

        if (port) {
            opts.port = port;
        }

        mod.startServer(opts);
    },
};
