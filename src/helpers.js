// TODO some helpful utils, like image generator
const Mock = require('mockjs');

async function genImageStream(ctx) {
}

function mergeParams(ctx) {
    const { req } = ctx;
    return Object.assign({}, req.query, req.body, ctx.params);
}

module.exports = {
    Mock,
    genImageStream,
    mergeParams,
};
