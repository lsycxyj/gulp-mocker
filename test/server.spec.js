const path = require('path');
const supertest = require('supertest');

const mod = require('../src/server');

function finishCase(done) {
    return function (err) {
        if (err) {
            throw err;
        } else {
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
            logLevel: 'error',
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

    describe('Without config files', function () {
        const host = 'localhost';
        const port = 10086;
        const baseURL = `http://${host}:${port}`;

        const staticDataJSON = require('./mock/no_config/static_data.json');
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
            logLevel: 'error',
        };

        it(`mock /static_data => static_data.json`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                onServerStart() {
                    supertest(baseURL)
                        .get(`/static_data`)
                        .expect(200, staticDataJSON)
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
                        .expect(200, staticDataJSON)
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
                        .expect(403, staticDataJSON)
                        .end(finishCase(done));
                },
            }));

            server = ret.webServer;
        });

        it(`mock with proxy /another/path/to/data => proxy`, function (done) {
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

        it(`mock with proxy and path rewrite /another/another/path/to/data => proxy`, function (done) {
            const ret = mod.startServer(Object.assign({}, baseOpts, {
                fallback: true,
                proxies: [
                    {
                        source: '/another/(.*)',
                        options: {
                            target: 'http://localhost:20000',
                            pathRewrite: {'^/another' : ''},
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
    });
});
