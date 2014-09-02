var gulp         = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    jshint       = require('gulp-jshint'),
    rename       = require('gulp-rename'),
    concat       = require('gulp-concat'),
    notify       = require('gulp-notify'),
    cache        = require('gulp-cache'),
    sourcemaps   = require('gulp-sourcemaps'),
    livereload   = require('gulp-livereload'),
    source       = require('vinyl-source-stream'),
    browserify   = require('browserify'),
    del          = require('del');

// gulp.task('static', function (cb) {
//   return gulp.src('./src/index.html')
//     .pipe(gulp.dest('./dist'));
// });

gulp.task('clean', function (cb) {
  del(['dist/*'], cb);
});

// gulp.task('styles', ['clean'], function () {
//   gulp.src('./src/styles/app.less')
//     .pipe(sourcemaps.init())
//     .pipe(less())
//     .pipe(sourcemaps.write())
//     .pipe(gulp.dest('./dist/styles'));
// });

// gulp.task('jshint', function () {
//   return gulp.src([
//       './src/scripts/*.js',
//       './src/scripts/**/*.js'
//     ])
//     .pipe(jshint('.jshintrc'))
//     .pipe(jshint.reporter('default'));
// });

gulp.task('scripts', ['clean'], function () {
  return browserify({
      entries: ['./src/scripts/app.js']
    })
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('dist/scripts'))
    .pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task('compile', ['scripts']);

gulp.task('default', ['compile']);

gulp.task('watch', function () {
//   gulp.watch([ 'src/styles/*.less', 'src/styles/**/*.less'], ['styles']);
  gulp.watch(['src/scripts/*.js', 'src/scripts/**/*.js'], ['scripts']);
//   gulp.watch(['dist/**']).on('change', livereload.changed);
});
