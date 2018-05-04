# gulp-mocker

> A mock server for gulp and beyond gulp. Enjoy mocking!

### Pull requests are welcome :)

## License
LGPL-V3  
[![License: LGPL v3](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](http://www.gnu.org/licenses/lgpl-3.0)

## Features
#### Return mock responses just place files into mock directory

> /path/to/api => 'mock/path/to/api|api.json|api.js'

#### JSONP support

> /path/to/api?callback=jsonp => jsonp response with 'mock/path/to/api|api.json|api.js' data

#### Highly customized response

> You can write any kind of response in the js response file.

#### Fallback to proxies
```javascript
// option
{
    fallback: true,
    proxies: [{
        // Proxy option
    }]
}
```

#### HTTPS support
```javascript
// option
{
    useHTTPS: true,
    httpsOptions: {
        // HTTPS Option
    }
}
```

#### Run it with command line
```sh
$ npm install -g gulp-mocker
# Further more, the config file can be ignored!
$ gulp-mock --config mock.config.js
```
`gulp-mock -h` for more information

#### Run it programmatically 
```javascript
const mod = require('gulp-mocker/src/server');
const { webServer, app } = mod.startServer({
    // Options
});
```

#### Tested (Not 100% though LOL)
[![Coverage](https://img.shields.io/codecov/c/github/lsycxyj/gulp-mocker/master.svg)](https://codecov.io/github/lsycxyj/gulp-mocker?branch=master)

## Installation

[![gulp-mocker](https://nodei.co/npm/gulp-mocker.png)](https://npmjs.org/package/gulp-mocker)

`npm install gulp-mocker`

## Examples
> See "mock" folder

## Config
```javascript
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
```

## Mock Config File
```javascript
module.exports = {
    /**
     * Wrapper
     * Only works for json response.
     * Default: null
     */
    /**
     * Static Response Wrapper
     * If the value of "wrapper" is a plain object, it will be a "Static Response Wrapper"
     * All responses will wrap the same format of wrapper,
     * and the "Wrapper Content Placeholder" will replace the response content
     */
    // wrapper: {
    //     code: 200,
    //     msg: 'success',
    //     data: '{{!--WrapperContent--}}',
    // },
    /**
     * Dynamic Response Wrapper
     * If the value of "wrapper" is a function, it will be a "Dynamic Response Wrapper"
     * All responses can be handled manually by you. And you should return a JSON object.
     * @param {Object}
     *      ctx {Object}: context of koa
     *      resResult {Object}: mock response content
     *      helpers: {Object}: See "Helpers"
     * @returns {Object|Promise<Object>}: Dynamic wrapper processed response. The Object should have the following structure
     *      body {*}: The value will be set as the koa's body of ctx
     *      contentType? {String}: Optional. The value will be used as content type if it's set.
     *      status? {Number}: Optional. Response status code.
     */
    // wrapper: function({ ctx, resResult }) {
    //     // Do whatever you want
    //     return {
    //         body: ctx.body,
    //     };
    // },

    /**
     * Wrapper Content Placeholder
     * Default: {{!--WrapperContent--}}
     *
     * This string will be replaced by the response data in the wrapper.
     * Only works for Static Response Wrapper
     */
    wrapperContentPlaceHolder: '{{!--WrapperContent--}}',

    /**
     * Mock Type
     * Default: 'normal'
     *
     * Available values:
     * normal: It will try to find certain kinds of extensions of file by the request path. See the config's "mockExtOrder" property.
     * mockjs: Responses will be treated as the parameters of MockJS after the process of "normal"
     */
    mockType: 'normal',

    /**
     * Delay
     * Default: 0
     *
     * Response delay emulation in millisecond.
     */
    delay: 0,

    /**
     * Pass through Proxy
     * Default: false
     *
     * Any request will pass through the proxy directly. Only available when the fallback is proxy and the proxy is available.
     */
    passThroughProxy: false,
};
```

## Dynamic response
```javascript
/**
 * Dynamic Response
 * If the value of "module.exports" is a function, it will be a "Dynamic Response"
 * All responses can be handled manually by you. And you should return a JSON object.
 * @param {Object}
 *      ctx {Object}: context of koa
 *      resResult {Object}: mock response content
 *      helpers: {Object}: See "Helpers"
 * @returns {Object|Promise<Object>}: Dynamic wrapper processed response. The Object should have the following structure
 *      body {*}: The value will be set as the koa's body of ctx
 *      contentType? {String}: Optional. The value will be used as content type if it's set.
 *      status? {Number}: Optional. Response status code.
 */
```

## Helpers
```javascript
/**
 * Helpers
 * It's a group of tools that help you to make dynamic responses. It has the following properties:
 *
 *    // `mime` from npm: https://www.npmjs.com/package/mime
 *    mime,
 *
 *    // `mockjs` from npm: https://www.npmjs.com/package/mockjs
 *    Mock,
 *
 *    // Generate a stream of image
 *    // @param opts: {
 *    //          // Size of image by pixel. Format: `${width}x${height}`
 *    //          size: string,
 *    //          // Background color of image
 *    //          background: string,
 *    //          // Foreground color of text
 *    //          foreground: string,
 *    //          // Format of image. Available values: png, jpg, gif
 *    //          format: string,
 *    //          // Foreground text content
 *    //          text: string,
 *    //      }
 *    // @returns {Promise.<stream>} The stream of image
 *    genImageStream: function,
 *
 *    // Generate a image response
 *    // @param opts {Object}: The same as genImageStream
 *    // @returns {Promise.<Object>} The response for dynamic response
 *    genImageResponse: function,
 *
 *    // Merge query, post body, parameters from request
 *    // @param ctx: `ctx` of koa
 *    // @returns {Object}
 *    mergeParams: function,
 */
```

## TODO list
- More test cases.
- Generate image response by myself instead of depending other online services.
- More other features.
