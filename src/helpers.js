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

/**
 * Generate a stream of image
 * @param opts: {
 *          // Size of image by pixel. Format: `${width}x${height}`
 *          size: string,
 *          // Background color of image
 *          background: string,
 *          // Foreground color of text
 *          foreground: string,
 *          // Format of image. Available values: png, jpg, gif
 *          format: string,
 *          // Foreground text content
 *          text: string,
 *      }
 * @returns {Promise.<stream>} The stream of image
 */
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

/**
 * Generate a image response
 * @param opts {Object}: The same as genImageStream
 * @returns {Promise.<Object>} The response for dynamic response
 */
async function genImageResponse(opts = {}) {
    const { format } = opts;
    const s = await genImageStream(opts);

    return {
        body: s,
        // PNG by default
        contentType: mime.getType(format || 'png'),
    };
}

/**
 * Merge query, post body, parameters from request
 * @param ctx: `ctx` of koa
 * @returns {Object}
 */
function mergeParams(ctx) {
    const { query, request } = ctx;
    return Object.assign({}, query, request.body);
}

module.exports = {
    mime,
    Mock,
    genImageStream,
    genImageResponse,
    mergeParams,
};
