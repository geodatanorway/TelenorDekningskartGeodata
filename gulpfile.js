var gulp         = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    jshint       = require('gulp-jshint'),
    jshintyfancy = require('jshint-stylish'),
    less         = require('gulp-less'),
    rename       = require('gulp-rename'),
    concat       = require('gulp-concat'),
    notify       = require('gulp-notify'),
    cache        = require('gulp-cache'),
    sourcemaps   = require('gulp-sourcemaps'),
    livereload   = require('gulp-livereload'),
    source       = require('vinyl-source-stream'),
    browserify   = require('browserify'),
    embedlr      = require('gulp-embedlr'),
    del          = require('del'),
    connect      = require('connect'),
    serveStatic  = require('serve-static')
    ;

gulp.task('server', function () {
  connect()
    .use(serveStatic(__dirname + '/dist'))
    .listen(3000);
});
gulp.task('static', function () {
  return gulp.src('./src/index.html')
    .pipe(embedlr())
    .pipe(gulp.dest('./dist'))
    .pipe(livereload());
});

gulp.task('styles', function () {
  gulp.src('./src/styles/app.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/styles'))
    .pipe(livereload())
    .pipe(notify({ message: 'styles task complete' }));
});

// gulp.task('jshint', function () {
//   return gulp.src([
//       './src/scripts/*.js',
//       './src/scripts/**/*.js'
//     ])
//     .pipe(jshint('.jshintrc'))
//     .pipe(jshint.reporter('default'));
// });

gulp.task('scripts', function () {
  return browserify({
      entries: ['./src/scripts/app.js']
    })
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('dist/scripts'))
    .pipe(livereload())
    .pipe(notify({ message: 'scripts task complete' }));
});

gulp.task('compile', ['scripts', 'styles', 'static']);

gulp.task('default', ['compile']);

gulp.task('watch', ['compile', 'server'], function () {
  gulp.watch(['src/styles/*.less', 'src/styles/**/*.less'], ['styles']);
  gulp.watch(['src/scripts/*.js', 'src/scripts/**/*.js'], ['scripts']);
});
