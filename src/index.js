const koa = require('koa');
const c2k = require('koa-connect');
const proxyMiddleware = require('http-proxy-middleware');
const _ = require('lodash');
const path = require('path');
const log = require('fancy-log');
const mockMiddleware = require('./mock-middleware');

const DEFAULT_OPTS = {
  allowCrossOrigin: false,
  fallback: false,
  host: 'localhost',
  useHTTPS: false,
  middlewares: [],
  mockPath: './mock',
  proxies: [],
};

function startServer(opts) {
  const app = koa();
  opts = Object.assign({}, DEFAULT_OPTS, opts);

  const { allowCrossOrigin, useHTTPS, fallback, middlewares, mockPath, proxies } = opts;

  // middlewares
  if (_.isFunction(middlewares)) {
    app.use(middlewares);
  } else if (_.isArray(middlewares)) {
    middlewares.filter(m => _.isFunction(m))
      .forEach(m => app.use(m));
  }

  if (allowCrossOrigin) {
  	log.warn('Allow Cross Origin enabled');
  }

  app.use(mockMiddleware(opts));
}

