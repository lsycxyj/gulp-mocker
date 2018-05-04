/**
 * Dynamic Response
 * If the value of "module.exports" is a function, it will be a "Dynamic Response"
 * All responses can be handled manually by you. And you should return a JSON object.
 * @param {Object}
 *      ctx {Object}: context of koa
 *      resResult {Object}: mock response content
 *      helpers: {Object}: See "Helpers"
 * @returns {Object|Promise<Object>}: Dynamic wrapper processed response. The Object should have the following structure
 *      body {*}: The value will be set as the koa's body of ctx
 *      contentType? {String}: Optional. The value will be used as content type if it's set.
 *      status? {Number}: Optional. Response status code.
 */
module.exports = function () {
    return {
        body: Math.random(),
    };
};
