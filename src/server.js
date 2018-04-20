const through = require('through2');
const chalk = require('chalk');
const koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const log = require('fancy-log');
const mockMiddleware = require('./mock-middleware');
const allowCrossOriginMiddleware = require('./allow-cross-origin-middleware');

const { isFunction } = _;

const DEFAULT_OPTS = {
    allowCrossOrigin: false,
    allowCrossOriginHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
    allowCrossOriginHost: '*',
    allowCrossOriginMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    bodyParserConfig: {
        jsonLimit: '100mb',
        formLimit: '100mb',
    },
    fallback: false,
    fallbackRules: ['emptyBody', 'status404', 'status500'],
    host: 'localhost',
    httpsEnabled: false,
    httpsOptions: {
        key: fs.readFileSync(path.resolve(__dirname, '../ssl/ssl.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../ssl/ssl.crt')),
    },
    jsonpParamName: 'callback',
    middlewares: [],
    mockConfigName: '_.config.js',
    mockExtOrder: ['', '.json', '.js'],
    mockPath: './mock',
    onServerStart: null,
    port: 10086,
    proxies: [],
    watchMockConfig: true,
};

function startServer(opts) {
    const app = new koa();
    opts = Object.assign({}, DEFAULT_OPTS, opts);

    const {
        allowCrossOrigin,
        bodyParserConfig,
        host,
        httpsEnabled,
        httpsOptions,
        middlewares,
        mockPath,
        onServerStart,
        port,
    } = opts;

    const watchers = [];

    function _onServerStart(err) {
        if (err) {
            log.error(err);
        } else {
            log.info(`Mock Server started at ${chalk.cyan(`http${httpsEnabled ? 's' : ''}://${host}:${port}`)}.`);
        }

        if (isFunction(onServerStart)) {
            onServerStart(err);
        }
    }

    function tearDownWatchers() {
        for (const watcher of watchers) {
            watcher.close();
        }
    }

    // middlewares
    app.use(koaBodyParser(bodyParserConfig));

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

    app.use(mockMiddleware(opts, { watchers }));

    // Web server
    let webServer;

    if (httpsEnabled) {
        webServer = https.createServer(httpsOptions, app.callback())
            .listen(port, host, _onServerStart);
    } else {
        webServer = http.createServer(app.callback())
            .listen(port, host, _onServerStart);
    }

    const closeWebServer = webServer.close.bind(webServer);

    // Override close function to do something when the server is torn down.
    webServer.close = function () {
        tearDownWatchers();
        closeWebServer.apply(webServer, arguments);
    };

    return {
        app,
        webServer,
    };
}

function startGulpServer(opts) {
    const { webServer } = startServer(opts);

    const stream = through.obj(function (file, enc, callback) {
        const me = this;
        me.push(file);
        callback();
    });

    stream.on('kill', function () {
        webServer.close();
    });

    return stream;
}

module.exports = {
    startServer,
    startGulpServer,
};
