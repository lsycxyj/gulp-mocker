const path = require('path');
const supertest = require('supertest');
const chai = require('chai');

const { expect, assert } = chai;

const mod = require('../src/server');

function finishCase(done, beforeDone) {
    return function (err) {
        if (err) {
            throw err;
        } else {
            beforeDone && beforeDone();
            done();
        }
    };
}

describe('gulp-mocker', function () {
    let anotherServer = null;
    let server = null;
    let stream = null;

    before(function (done) {
        const ret = mod.startServer({
            mockPath: path.resolve(path.join(__dirname, 'mock/another')),
            host: 'localhost',
            port: 20000,
            logLevel: 'none',
            onServerStart() {
                done();
            },
        });
        anotherServer = ret.webServer;
    });

    after(function () {
        if (anotherServer) {
            anotherServer.close();
            anotherServer = null;
        }
    });

    afterEach(function () {
        if (server) {
            server.close();
            server = null;
        }

        if (stream) {
            stream.emit('kill');
            stream = null;
        }
    });

    describe('With config files', function () {
        const host = 'localhost';
        const port = 10086;
        const baseURL = `http://${host}:${port}`;

        const staticDataWithConfigJSON = require('./mock/with_config/path/static_wrapper/static_data.json');
        const proxyDataJSON = require('./mock/another/another/path/to/data.json');

        const proxies = [
            {
                source: '/another/(.*)',
                options: {
                    target: 'http://localhost:20000',
                    changeOrigin: true,
                },
            }
        ];

        const baseOpts = {
            mockPath: path.resolve(path.join(__dirname, 'mock/with_config')),
            host,
            port,
            logLevel: 'none',
            mockConfigName: '__.config.js',
        };

        it(`mock /path/static_wrapper/static_data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/path/static_wrapper/static_data`)
                        .expect(200, {
                            code: 200,
                            msg: 'success',
                            data: staticDataWithConfigJSON,
                        })
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /path/dynamic_wrapper/data => data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/path/dynamic_wrapper/data`)
                        .expect(403, {
                            code: 403,
                            msg: 'error',
                            data: staticDataWithConfigJSON,
                        })
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /path/async_dynamic_wrapper/data => data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/path/async_dynamic_wrapper/data`)
                        .expect(403, {
                            code: 403,
                            msg: 'error',
                            data: staticDataWithConfigJSON,
                        })
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /path/error_async_dynamic_wrapper/data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/path/error_async_dynamic_wrapper/data`)
                        .expect(200, staticDataWithConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /path/delay/data => data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    const tsStart = Date.now();
                    supertest(baseURL)
                        .get(`/path/delay/data`)
                        .expect(200, staticDataWithConfigJSON)
                        .end(function (err) {
                            expect(Date.now() - tsStart).to.be.above(500);
                            finishCase(done)(err);
                        });
                },
            }));

            server = ret.webServer;
        });

        it(`mock /path/mockjs/result => result.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/path/mockjs/result`)
                        .expect(200)
                        .end(function (err, res) {
                            finishCase(done, function () {
                                expect(res).to.own.property('body');
                                const { body } = res;
                                expect(body).to.own.property('name');
                                expect(body.name).to.be.oneOf(['Hello', 'Mock.js', '!']);
                            })(err);
                        });
                },
            }));

            server = ret.webServer;
        });

        it(`mock with config pass through /another/path/to/data => proxy`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                fallback: true,
                proxies,
                onServerStart() {
                    supertest(baseURL)
                        .get(`/another/path/to/data`)
                        .expect(200, proxyDataJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock with error syntax config /path/error_config/data => not found`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/path/error_config/data`)
                        .expect(200, staticDataWithConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });
    });

    describe('Without config files', function () {
        const host = 'localhost';
        const port = 10086;
        const baseURL = `http://${host}:${port}`;

        const staticDataNoConfigJSON = require('./mock/no_config/static_data.json');
        const proxyDataJSON = require('./mock/another/another/path/to/data.json');

        const proxies = [
            {
                source: '/another/(.*)',
                options: {
                    target: 'http://localhost:20000',
                    changeOrigin: true,
                },
            }
        ];

        const baseOpts = {
            mockPath: path.resolve(path.join(__dirname, 'mock/no_config')),
            host,
            port,
            logLevel: 'none',
        };

        it(`mock /static_data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/static_data`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock extension test order /static_data => static_data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                mockExtOrder: ['.js', '.json'],
                onServerStart() {
                    supertest(baseURL)
                        .get(`/static_data`)
                        .expect(200, require('./mock/no_config/static_data'))
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock allow cross origin /static_data => static_data.json`, function (done) {
            const allowCrossOriginHeaders = ['Origin', 'Content-Type', 'Accept'];
            const allowCrossOriginMethods = ['GET'];
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                allowCrossOrigin: true,
                allowCrossOriginHeaders,
                allowCrossOriginHost: baseURL,
                allowCrossOriginMethods,
                onServerStart() {
                    supertest(baseURL)
                        .get(`/static_data`)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                throw err;
                            } else {
                                expect(res).to.own.property('header');
                                const { header } = res;
                                expect(header['access-control-allow-headers']).to.be.equal(allowCrossOriginHeaders.join(','));
                                expect(header['access-control-allow-origin']).to.be.equal(baseURL);
                                expect(header['access-control-allow-methods']).to.be.equal(allowCrossOriginMethods.join(','));
                                done();
                            }
                        });
                },
            }));

            server = ret.webServer;
        });

        it(`mock jsonp /static_data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                jsonpParamName: 'jsonp',
                onServerStart() {
                    supertest(baseURL)
                        .get(`/static_data?jsonp=test`)
                        .expect(200, `test(${JSON.stringify(staticDataNoConfigJSON)});`)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /dynamic_data => dynamic_data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/dynamic_data`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /async_dynamic_data => async_dynamic_data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/async_dynamic_data`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /image.png => image.png.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/image.png?size=200x200&format=png`)
                        .expect(200)
                        // TODO
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /async_dynamic_error_data => async_dynamic_error_data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/async_dynamic_error_data`)
                        .expect(404)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /dynamic_data_403 => dynamic_data_403.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/dynamic_data_403`)
                        .expect(403, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /error_syntax_data => error_syntax_data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/error_syntax_data`)
                        .expect(404)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock with proxy and pass through /another/path/to/data => proxy`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                fallback: true,
                proxies,
                onServerStart() {
                    supertest(baseURL)
                        .get(`/another/path/to/data`)
                        .expect(200, proxyDataJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock with proxy fallback rules /another/dynamic_data_403 => proxy`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                fallback: true,
                fallbackRules: [function (data) {
                    expect(data).to.be.an('object');
                    const { ctx } = data;
                    expect(ctx).to.be.an('object');
                    expect(ctx.status).to.be.equal(403);
                    return true;
                }],
                proxies,
                onServerStart() {
                    supertest(baseURL)
                        .get(`/another/dynamic_data_403`)
                        .expect(404)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        // it(`mock with proxy fallback to mock server /another/path/to/not_exist => proxy => mock server`, function (done) {
        //     const ret = mod.startServer(Object.assign({}, baseOpts, {
        //         fallback: 'mock',
        //         proxies,
        //         onServerStart() {
        //             supertest(baseURL)
        //                 .get(`/another/path/to/not_exist`)
        //                 .expect(200, staticDataNoConfigJSON)
        //                 .end(finishCase(done));
        //         },
        //     }));
        //
        //     server = ret.webServer;
        // });

        it(`mock with proxy and path rewrite /another/another/path/to/data => proxy`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                fallback: true,
                proxies: [
                    {
                        source: '/another/(.*)',
                        options: {
                            target: 'http://localhost:20000',
                            pathRewrite: { '^/another': '' },
                            changeOrigin: true,
                        },
                    }
                ],
                onServerStart() {
                    supertest(baseURL)
                        .get(`/another/another/path/to/data`)
                        .expect(200, proxyDataJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it('mock with rewrite pure string /rewrite/test => static_data', function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                rewrites: [
                    {
                        from: '/rewrite/(.*)',
                        to: '/static_data',
                    },
                ],
                onServerStart() {
                    supertest(baseURL)
                        .get(`/rewrite/test`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));
            server = ret.webServer;
        });

        it('mock with rewrite RegExp and function /rewrite/test => static_data', function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                rewrites: [
                    {
                        from: /^\/rewrite\/.*/,
                        to(result) {
                            expect(result).to.be.an('object');
                            expect(result.ctx).to.be.an('object');
                            expect(result.exec).to.be.an('array');
                            expect(result.keys).to.be.an('array');
                            return '/static_data';
                        },
                    },
                ],
                onServerStart() {
                    supertest(baseURL)
                        .get(`/rewrite/test`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));
            server = ret.webServer;
        });
    });
});
