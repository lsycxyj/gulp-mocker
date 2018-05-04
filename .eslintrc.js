module.exports = {
    extends: [
        'nodejs',
    ],
    rules: {
        'indent': ['error', 4, {
            SwitchCase: 1
        }],
        'linebreak-style': 0,
        'space-before-function-paren': ['error', {
            'anonymous': 'always',
            'named': 'never',
            'asyncArrow': 'always'
        }],
        'strict': 0,
        'prefer-arrow-callback': 0,
        'quotes': ['error', 'single', {
            allowTemplateLiterals: true,
        }],
    },
};
