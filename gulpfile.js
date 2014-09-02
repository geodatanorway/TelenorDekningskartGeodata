var gulp         = require('gulp'),
    jshint       = require('gulp-jshint'),
    less         = require('gulp-less'),
    notify       = require('gulp-notify'),
    sourcemaps   = require('gulp-sourcemaps'),
    livereload   = require('gulp-livereload'),
    source       = require('vinyl-source-stream'),
    browserify   = require('browserify'),
    embedlr      = require('gulp-embedlr'),
    connect      = require('connect'),
    serveStatic  = require('serve-static'),
    plumber      = require('gulp-plumber')
    ;

gulp.task('server', function () {
  connect()
    .use(serveStatic(__dirname + '/dist'))
    .listen(3000);
});

gulp.task('static', function () {
  return gulp.src('./src/index.html')
    .pipe(embedlr())
    .pipe(gulp.dest('./dist'));
});

gulp.task('styles', function () {
  gulp.src('./src/styles/app.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/styles'));
});

gulp.task('jshint', function () {
  return gulp.src([
      './src/scripts/*.js',
      './src/scripts/**/*.js'
    ])
    .pipe(plumber())
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('scripts', ['jshint'], function () {
  return browserify({
      entries: ['./src/scripts/app.js'], debug: true
    })
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('compile', ['scripts', 'styles', 'static']);

gulp.task('default', ['compile']);

gulp.task('watch', ['compile', 'server'], function () {
  gulp.watch(['src/styles/*.less', 'src/styles/**/*.less'], ['styles']);
  gulp.watch(['src/scripts/*.js', 'src/scripts/**/*.js'], ['scripts']);
  gulp.watch(['src/*.html'], ['static']);
  livereload.listen();
  gulp.watch('dist/**').on('change', livereload.changed);
});
