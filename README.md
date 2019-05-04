# gulp-mocker

> Gulp Mocker. A mock server can be used with gulp, or run it in command line, or run it programmatically, and more. Enjoy mocking!

### Pull requests are welcome :)

![Build Status](https://travis-ci.org/lsycxyj/gulp-mocker.svg?branch=master)
[![Coverage](https://img.shields.io/codecov/c/github/lsycxyj/gulp-mocker/master.svg)](https://codecov.io/github/lsycxyj/gulp-mocker?branch=master)

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

#### Fallback to Proxies
```javascript
// option
{
    fallback: true,
    proxies: [{
        // Proxy option
    }]
}
```

#### HTTPS Support
```javascript
// option
{
    useHTTPS: true,
    httpsOptions: {
        // HTTPS Option
    }
}
```

#### Mock File Relocation
```javascript
// option
{
    mockPathRewrite({ctx, defaultPath) {
        let ret = defaultPath;
        if (defaultPath === '/index.php') {
            const q = ctx.query;
            ret = `/${q.class}/${q.method}`;
        }
        return ret;
    }
}
```

#### With Gulp
```javascript
const gulpMocker = require('gulp-mocker');
gulp.src('whatever')
    .pipe(gulpMocker({
        // Put options here
    }))
    .pipe(// Nothing changed, do whatever you want)
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

## Options
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
    /*
     *  {Function}: Rewrite the request path to the specified one. By default it won't rewrite.
     *  Note that this option won't affect the url of fallback request
     *  The function has following signature:
     *      function: String ({
     *         // `ctx` of koa.
     *         ctx: Object,
     *         // The request path of default behaviour
     *         defaultPath: String,
     *      })
     */
    mockPathRewrite: null,
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
     *      // Note that this option will affect the url of fallback request
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
// Note: All the options will be merged shallowly
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

    /**
     * Additional http headers for responses.
     * eg. {'Etag': '1234'}
     * Default: Empty object
     */
    headers: {},
};
```

## Dynamic response
```javascript
/**
* @returns {Object|Promise<Object>}: A response generated by js should return the following structure:
*      body {*}: The value will be set as the koa's body of ctx
*      contentType? {String}: Optional. The value will be used as content type if it's set.
*      headers? {Object}: Optional. Additional http headers for responses. eg. {'Etag': '1234'}
*                         In addition, headers in dynamic response will override headers in mock config file
*                         if they have same keys.
*      passThroughProxy? {Boolean}: Optional. Request will pass through the proxy directly.
*                                   Only available when the fallback is proxy and the proxy is available.
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

## Recipes and Case Studies
### Multiple hosts with fallback and *WebpackDevServer* by only one mocking server
1. Set the proxy option of *WebpackDevServer* and forward all the requests to the mocking server. Let's say the dev server listens to port 8080 and the mocking server listens port 10086 of localhost:
```javascript
const webpackConfig = {
    devServer: {
        disableHostCheck: true,
        port: 8080,
        proxy: {
            '/api': {
                target: 'http://localhost:10086',
            },
        },
    },
};
```
1. Change your requests to multiple host aliases of localhost. Let's say you have two hosts `a.com` and `b.com` which provide API services.
    1. Edit host file
    ```
    127.0.0.1 localhost.a.com
    127.0.0.1 localhost.b.com
    ```
    1. Change your API hosts from `x.com/api` to `localhost.x.com:10086/api`
1. And the options for *gulp-mocker* should be like this:
```javascript
gulpMocker({
    mockPath: './mock',
    port: 10086,
    fallback: true,
    proxies: [
        {
            source: '/api/(.*)',
            options: {
                // Default target
                target: 'a.com',
                changeOrigin: true,
                router: {
                    // Override default target by different coming hosts
                    'localhost.a.com:8080': 'http://a.com',
                    'localhost.b.com:8080': 'http://b.com',
                },
            },
        },
    ],
    /*
    mockPathRewrite({ ctx, defaultPath }) {
        // Change the local mocking file path if it's needed.
        return 'newPath';
    }
    */
});
```
