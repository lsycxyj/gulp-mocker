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
     * @returns {Object} Processed response
     */
    // wrapper: function({ ctx, resResult }) {
    //     // Do whatever you want
    //     return ctx.body
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
};
