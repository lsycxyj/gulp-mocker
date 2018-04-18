const mod = require('./src/server');

mod.startServer({
    proxies: [
        {
            source: '/anything/(.*)',
            context: '/anything/*',
            options: {
                target: 'http://httpbin.org',
                changeOrigin: true,
            },
        },
    ],
    fallback: true,
});
