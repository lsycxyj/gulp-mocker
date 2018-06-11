const path = require('path');
const fs = require('fs');
const glob = require('glob')
const supertest = require('supertest');
const chai = require('chai');
const chaiSpies = require('chai-spies');
const Vinyl = require('vinyl');
const request = require('request');
// const MemoryFileSystem = require('memory-fs');

process.env.NODE_ENV = 'test';

chai.use(chaiSpies);

const { expect, assert, spy } = chai;

const mod = require('../src/server');

const mockMiddlewareExposed = global.__test__mock__middleware__;

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

describe('gulp-mocker source files tests', function () {
    it('bin files should not have CRLF linebreak', function () {
        const rootPath = path.join(__dirname, '..');
        const filenames = glob.sync('bin/**/*.js', {
            root: rootPath,
        });
        for (const filename of filenames) {
            const content = fs.readFileSync(path.join(rootPath, filename), 'utf-8');
            expect(content.indexOf('\r\n')).to.be.equal(-1);
        }
    });
});

describe('gulp-mocker api tests', function () {
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

        it(`mock /path/headers/data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/path/headers/data`)
                        .expect(200, staticDataWithConfigJSON)
                        .expect('X-Response-Gulp-Mocker', '1')
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /path/headers/dynamic_data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/path/headers/dynamic_data`)
                        .expect(200, staticDataWithConfigJSON)
                        .expect('X-Response-Gulp-Mocker', '2')
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

        it(`watch mock config file change`, function (done) {
            this.timeout(10 * 1000);
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    const spied = spy(mockMiddlewareExposed.onMockConfigFileChange);
                    mockMiddlewareExposed.onMockConfigFileChange = spied;
                    const configFilePath = path.join(__dirname, 'mock/with_config/__.config.js');
                    const originalContent = fs.readFileSync(configFilePath, 'utf-8');
                    fs.writeFileSync(configFilePath, originalContent.replace('{{!--Content--}}', '{{!--ContentTest--}}'));

                    setTimeout(function () {
                        // restore
                        fs.writeFileSync(configFilePath, originalContent);

                        expect(spied).to.be.called();
                        done();
                    }, 3 * 1000);
                },
            }));

            server = ret.webServer;
        });
    });

    describe('Without config files', function () {
        const host = 'localhost';
        const port = 10086;
        const baseURL = `${host}:${port}`;
        const baseURLHTTP = `http://${baseURL}`;
        const baseURLHTTPS = `https://${baseURL}`;

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
                    supertest(baseURLHTTP)
                        .get(`/static_data`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock https /static_data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                useHTTPS: true,
                onServerStart() {
                    supertest(baseURLHTTP)
                        .get(`/static_data`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock POST /static_data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    const b = Buffer.alloc(10 * 1024 * 1024, 'a');
                    request.post({
                        url: `${baseURLHTTP}/static_data`,
                        formData: {
                            target: 'test_upload',
                            // file: fs.createReadStream(__dirname + '/server.spec.js'),
                            // Some big file
                            file: {
                                value: b,
                                options: {
                                    filename: 'test.txt',
                                    contentType: 'text/plain',
                                },
                            },
                        },
                    }, function (err, res, body) {
                        // console.log(err)
                        // console.log(res)
                        done()
                    });
                    // s.end();
                },
            }));

            server = ret.webServer;
        });

        it(`mock extension test order /static_data => static_data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                mockExtOrder: ['.js', '.json'],
                onServerStart() {
                    supertest(baseURLHTTP)
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
                allowCrossOriginHost: baseURLHTTP,
                allowCrossOriginMethods,
                onServerStart() {
                    supertest(baseURLHTTP)
                        .get(`/static_data`)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                throw err;
                            } else {
                                expect(res).to.own.property('header');
                                const { header } = res;
                                expect(header['access-control-allow-headers']).to.be.equal(allowCrossOriginHeaders.join(','));
                                expect(header['access-control-allow-origin']).to.be.equal(baseURLHTTP);
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
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
                        .get(`/async_dynamic_data`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /image.png => image.png.js`, function (done) {
            this.timeout(10 * 1000);
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURLHTTP)
                        .get(`/image.png?size=200x200&format=png`)
                        .expect(200)
                        // TODO size validation etc.
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /static_image.png => static_image.png`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURLHTTP)
                        .get(`/static_image.png`)
                        .expect(200)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock /async_dynamic_error_data => async_dynamic_error_data.js`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
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
                    supertest(baseURLHTTP)
                        .get(`/rewrite/test`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(finishCase(done));
                },
            }));
            server = ret.webServer;
        });

        it(`mock with gulp /static_data => static_data.json`, function (done) {
            const fileContent = 'content';
            const fakeFile = new Vinyl({
                contents: new Buffer(fileContent),
            });

            const stream = mod.startGulpServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURLHTTP)
                        .get(`/static_data`)
                        .expect(200, staticDataNoConfigJSON)
                        .end(function (err) {
                            expect(err).to.not.exist;

                            stream.write(fakeFile);

                            stream.once('data', function (file) {
                                assert(file.isBuffer());

                                assert.equal(file.contents.toString('utf8'), fileContent);

                                stream.emit('kill');

                                done();
                            })
                        });
                },
            }));
        });
    });
});
