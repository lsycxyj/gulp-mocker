const through = require('through2');
const chalk = require('chalk');
const koa = require('koa');
const c2k = require('koa-connect');
const proxyMiddleware = require('http-proxy-middleware');
const _ = require('lodash');
const path = require('path');
const http = require('http');
const https = require('https');
const log = require('fancy-log');
const mockMiddleware = require('./mock-middleware');
const allowCrossOriginMiddleware = require('./allow-cross-origin-middleware');

const DEFAULT_OPTS = {
    allowCrossOrigin: false,
    allowCrossOriginHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
    allowCrossOriginHost: '*',
    allowCrossOriginMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    fallback: false,
    host: 'localhost',
    jsonpParamName: 'callback',
    middlewares: [],
    mockConfigName: '_.config.js',
    mockExtOrder: ['', '.json', '.js'],
    mockPath: './mock',
    port: 10086,
    proxies: [],
    useHTTPS: false,
};

function startServer(opts) {
    const app = new koa();
    opts = Object.assign({}, DEFAULT_OPTS, opts);

    const {
        allowCrossOrigin,
        host,
        middlewares,
        port,
        proxies,
        useHTTPS,
    } = opts;

    function onServerStart(err) {
        if (err) {
            log.error(err);
        } else {
            log.info(`Mock Server started at ${chalk.cyan(`http://${host}:${port}`)}.`);
        }
    }

    // middlewares
    if (_.isFunction(middlewares)) {
        app.use(middlewares);
    } else if (_.isArray(middlewares)) {
        middlewares.filter(m => _.isFunction(m))
            .forEach(m => app.use(m));
    }

    if (allowCrossOrigin) {
        log.warn('Allow Cross Origin enabled');
        app.use(allowCrossOriginMiddleware(opts));
    }

    app.use(mockMiddleware(opts));

    let webServer;

    if (useHTTPS) {
        // TODO
    } else {
        webServer = http.createServer(app.callback())
            .listen(port, host, onServerStart);
    }

    return {
        app,
        webServer,
    };
}

function startGulpServer(opts) {
    const { webServer } = startServer(opts);

    const stream = through.obj(function(file, enc, callback) {
        const me = this;
        me.push(file);
        callback();
    });

    stream.on('kill', function() {
       webServer.close();
    });

    return stream;
}

module.exports = {
    startServer,
    startGulpServer,
};
