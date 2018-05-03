const through = require('through2');
const chalk = require('chalk');
const koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const koaBusBoy = require('koa-busboy');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const log = require('./logger');
const mockMiddleware = require('./mock-middleware');
const allowCrossOriginMiddleware = require('./allow-cross-origin-middleware');

const { isFunction } = _;
const { LEVEL_INFO } = log;

const DEFAULT_OPTS = {
    // {Boolean}: Whether add Allow-Cross-Origin header in response
    allowCrossOrigin: false,
    // {Array<String>|String}: Access-Control-Allow-Headers value
    allowCrossOriginHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
    // {String}: Access-Control-Allow-Host value
    allowCrossOriginHost: '*',
    // {Array<String>|String}: Access-Control-Allow-Methods
    allowCrossOriginMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // {Object}: Config object for koa-bodyparser
    bodyParserConfig: {
        jsonLimit: '100mb',
        formLimit: '100mb',
    },
    // {Object}: Config object for koa-busboy
    busboyConfig: {},
    /*
     *  {Boolean|String}: Whether use fallback. Available values:
     *      false: Not use fallback
     *      true|'proxy': Use fallback if the mock server fail to return response and fallback to proxy
     */
    fallback: false,
    /*
     *  {Array<String|Function>}: What kinds of circumstances are considered as failure.
     *  Available embedded rules:
     *      'emptyBody': If ctx.body is empty
     *      'status404': If the status code is 404
     *      'status500': If the status code is 500
     *  If it's a function, the signature should be like this:
     *      function: boolean ({
     *         // `ctx` of koa.
     *         ctx: Object,
     *      })
     */
    fallbackRules: ['emptyBody', 'status404', 'status500'],
    // {String}: Mock server host name
    host: 'localhost',
    // {Boolean}: Whether use https
    httpsEnabled: false,
    // {Object}: https options for `https.createServer()`
    httpsOptions: {
        key: fs.readFileSync(path.resolve(__dirname, '../ssl/ssl.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../ssl/ssl.crt')),
    },
    // {String}: Param name of JSONP
    jsonpParamName: 'callback',
    /*
     *  {String}: Logging level. Available values: 'none', 'error', 'warn', 'info'
     *  The levels above are in order. Any levels after the specific level of logging will be ignored.
     */
    logLevel: LEVEL_INFO,
    // {Array<Function>|Function}: Additional koa middlewares
    middlewares: [],
    // {String}: Mock config file name
    mockConfigName: '_.config.js',
    // {Array<String>}: Mock response will try to find files by the following order
    mockExtOrder: ['', '.json', '.js'],
    // {String}: Mock responses files' root path
    mockPath: './mock',
    // {Function}: Listener function when the web server starts
    onServerStart: null,
    // {Number}: Port of server
    port: 10086,
    /*
     *  {Array<{
     *      // Matching rule whether to use proxy or not, which can be parsed by path-to-regexp if it's a string. Required.
     *      source: RegExp|String,
     *      // `context` param of http-proxy-middleware. Optional.
     *      context?: String,
     *      // `options` param of http-proxy-middleware. Optional.
     *      options?: Object
     *  }>}: Proxy settings for http-proxy-middleware
     */
    proxies: [],
    /*
     *  {Boolean}: The mock server will scan all mock config files and cache them when the server starts.
     *  It will try to recollect the config files if any of config files changes when it's set to `true`
     */
    watchMockConfig: true,
    /*
     *  {Array<{
     *      // Matching rule whether to rewrite the request, which can be parsed by path-to-regexp if it's a string
     *      from: RegExp|String,
     *      // Where the request should be rewritten to:
     *      //      If it's a string, the request path will be replaced by it.
     *      //      If it's a function, the request path will be replaced by the return result of it. The signature should be like this:
     *      //          function: string (result: {
     *      //              // `ctx` of koa.
     *      //              ctx: Object,
     *      //              // `exec` result of RegExp object .
     *      //              exec: Array,
     *      //              // Keys from path-to-regexp. Available when `from` is a string.
     *      //              keys: Array,
     *      //          })
     *      to: String|Function
     *  }>}
     */
    rewrites: [],
};

function startServer(opts) {
    const app = new koa();
    opts = Object.assign({}, DEFAULT_OPTS, opts);

    const {
        allowCrossOrigin,
        bodyParserConfig,
        busboyConfig,
        host,
        httpsEnabled,
        httpsOptions,
        logLevel,
        middlewares,
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

    // log settings
    log.setLevel(logLevel);

    // middlewares
    app.use(koaBusBoy(busboyConfig));
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
