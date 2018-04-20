const gulp = require('gulp');
const gulpZip = require('gulp-zip');
const gulpMocker = require('./src/index');

gulp.task('mockExamples', function() {
    return gulp.src('src')
        .pipe(gulpMocker());
});

gulp.task('zip', function() {
    return gulp.src([
        'bin/**/*',
        'bin/**/.*',
        'src/**/*',
        'src/**/.*',
        'mock/**/*',
        'mock/**/.*',
        'test/**/*',
        'test/**/.*',
        'ssl/**/*',
        '.editorconfig',
        '.gitignore',
        'gulpfile.js',
        'package.json',
        'run.js',
        'README.md',
    ], {
        base: '.',
    })
        .pipe(gulpZip('gulp-mocker.zip'))
        .pipe(gulp.dest('.'));
});
