module.exports = {
    /**
     * Wrapper
     * Only works for json response.
     * Default: null
     */
    /**
     * Static Response Wrapper
     * If the value of "wrapper" is a plain object, it will be a "Static Response Wrapper"
     * All responses will wrap the same format of wrapper,
     * and the "Wrapper Content Placeholder" will replace the response content
     */
    // wrapper: {
    //     code: 200,
    //     msg: 'success',
    //     data: '{{!--WrapperContent--}}',
    // },
    /**
     * Dynamic Response Wrapper
     * If the value of "wrapper" is a function, it will be a "Dynamic Response Wrapper"
     * All responses can be handled manually by you. And you should return a JSON object.
     * @param {Object}
     *      ctx {Object}: context of koa
     *      resResult {Object}: mock response content
     *      helpers: {
     *          // `mime` from npm
     *          mime,
     *
     *          // `mockjs` from npm
     *          Mock,
     *
     *          // Generate a stream of image
     *          // @param opts: {
     *          //          // Size of image by pixel. Format: `${width}x${height}`
     *          //          size: string,
     *          //          // Background color of image
     *          //          background: string,
     *          //          // Foreground color of text
     *          //          foreground: string,
     *          //          // Format of image. Available values: png, jpg, gif
     *          //          format: string,
     *          //          // Foreground text content
     *          //          text: string,
     *          //      }
     *          // @returns {Promise.<stream>} The stream of image
     *          genImageStream: function,
     *
     *          // Generate a image response
     *          // @param opts {Object}: The same as genImageStream
     *          // @returns {Promise.<Object>} The response for dynamic response
     *          genImageResponse: function,
     *
     *          // Merge query, post body, parameters from request
     *          // @param ctx: `ctx` of koa
     *          // @returns {Object}
     *          mergeParams: function,
     *      }
     * @returns {Object} Processed response
     */
    // wrapper: function({ ctx, resResult }) {
    //     // Do whatever you want
    //     return {
    //         body: ctx.body,
    //     };
    // },

    /**
     * Wrapper Content Placeholder
     * Default: {{!--WrapperContent--}}
     *
     * This string will be replaced by the response data in the wrapper.
     * Only works for Static Response Wrapper
     */
    wrapperContentPlaceHolder: '{{!--WrapperContent--}}',

    /**
     * Mock Type
     * Default: 'normal'
     *
     * Available values:
     * normal: It will try to find certain kinds of extensions of file by the request path. See the config's "mockExtOrder" property.
     * mockjs: Responses will be treated as the parameters of MockJS after the process of "normal"
     */
    mockType: 'normal',

    /**
     * Delay
     * Default: 0
     *
     * Response delay emulation in millisecond.
     */
    delay: 0,

    /**
     * Pass through Proxy
     * Default: false
     *
     * Any request will pass through the proxy directly. Only available when the fallback is proxy and the proxy is available.
     */
    passThroughProxy: false,
};
