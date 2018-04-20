// TODO some helpful utils, like image generator
const Mock = require('mockjs');
const mime = require('mime');
const hyperquest = require('hyperquest');
const { Random } = Mock;

// hyperquest doesn't follow redirect
function hyperquestFolloRedirect(uri, options, cb) {
    const stream = hyperquest(uri, options, function (err, res) {
        if (res && res.statusCode === 302 || res.statusCode === 301) {
            return hyperquestFolloRedirect(res.headers.location, options, cb);
        } else {
            return cb(err, res, stream);
        }
    });
}

async function genImageStream(opts = {}) {
    const { size, background, foreground, format, text } = opts;
    return await new Promise((resolve, reject) => {
        hyperquestFolloRedirect(Random.image(size, background, foreground, format, text), {}, (err, res, stream) => {
           if (err) {
               reject(err);
           } else {
               resolve(stream);
           }
        });
    });
}

async function genImageResponse(opts = {}) {
    const { format } = opts;
    const s = await genImageStream(opts)

    return {
        body: s,
        // PNG by default
        contentType: mime.getType(format || 'png'),
    };
}

function mergeParams(ctx) {
    const { query, body, params } = ctx;
    return Object.assign({}, query, body, params);
}

module.exports = {
    mime,
    Mock,
    genImageStream,
    genImageResponse,
    mergeParams,
};
