const koa = require('koa');
const c2k = require('koa-connect');
const proxyMiddleware = require('http-proxy-middleware');
const _ = require('lodash');
const path = require('path');
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
    proxies: [],
    useHTTPS: false,
};

function startServer(opts) {
    const app = koa();
    opts = Object.assign({}, DEFAULT_OPTS, opts);

    const { allowCrossOrigin, useHTTPS, middlewares, proxies } = opts;

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
}

