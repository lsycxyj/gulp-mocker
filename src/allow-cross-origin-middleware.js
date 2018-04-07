module.exports = function (opts) {
    const {
        allowCrossOriginHeaders,
        allowCrossOriginHost,
        allowCrossOriginMethods,
    } = opts;

    return async function (ctx, next) {
        const { request, response } = ctx;
        const { protocol } = request;

        if (allowCrossOriginHeaders.length > 0) {
            ctx.set('Access-Control-Allow-Headers', allowCrossOriginHeaders.join(','));
        }

        ctx.set('Access-Control-Allow-Origin', allowCrossOriginHost === '*' ? allowCrossOriginHost : `${protocol}://${allowCrossOriginHost}`);

        if (allowCrossOriginMethods.length > 0) {
            ctx.set('Access-Control-Allow-Methods', allowCrossOriginMethods.join(','));
        }

        next();
    };
};
