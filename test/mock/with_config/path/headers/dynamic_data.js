const data = require('../static_wrapper/static_data.json');
module.exports = function () {
    return {
        body: data,
        headers: {
            'X-Response-Gulp-Mocker': '1',
        }
    };
};
