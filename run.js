const mod = require('./src/server');

mod.startServer({
    proxies: [
        {
            // RegExp compiled by path-to-regexp or a RegExp
            source: '/anything/(.*)',
            // context: '/anything/*',
            options: {
                target: 'http://httpbin.org',
                changeOrigin: true,
            },
        },
    ],
    fallback: true,
});
