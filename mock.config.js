module.exports = {
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
    rewrites: [
        {
            from: '/rewrite/(.*)',
            to: '/path/to/api/static_data',
        },
    ],
    // useHTTPS: true,
    fallback: true,
};
