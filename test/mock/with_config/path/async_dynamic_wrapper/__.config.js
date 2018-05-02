const data = require('../static_wrapper/static_data.json');

module.exports = {
    async wrapper() {
        return {
            status: 403,
            body:  {
                code: 403,
                msg: 'error',
                data,
            },
        }
    },
};
