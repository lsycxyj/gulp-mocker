const gulp = require('gulp');
const gulpZip = require('gulp-zip');
const gulpMocker = require('./src/index');

gulp.task('mockExamples', function () {
    return gulp.src('src')
        .pipe(gulpMocker());
});

gulp.task('zip', function () {
    return gulp.src([
        '.editorconfig',
        '.eslintrc.js',
        '.gitattributes',
        '.gitignore',
        '.travis.yml',
        'LICENSE',
        'README.md',
        'bin/**/*',
        'bin/**/.*',
        'gulpfile.js',
        'mock/**/*',
        'mock/**/.*',
        'package.json',
        'run.js',
        'src/**/*',
        'src/**/.*',
        'ssl/**/*',
        'test/**/*',
        'test/**/.*',
    ], {
        base: '.',
    })
        .pipe(gulpZip('gulp-mocker.zip'))
        .pipe(gulp.dest('.'));
});
