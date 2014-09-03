var gulp         = require('gulp'),
    jshint       = require('gulp-jshint'),
    less         = require('gulp-less'),
    notify       = require('gulp-notify'),
    sourcemaps   = require('gulp-sourcemaps'),
    livereload   = require('gulp-livereload'),
    source       = require('vinyl-source-stream'),
    buffer       = require('vinyl-buffer'),
    browserify   = require('browserify'),
    es6ify       = require('es6ify'),
    embedlr      = require('gulp-embedlr'),
    connect      = require('connect'),
    serveStatic  = require('serve-static'),
    gulpif       = require('gulp-if'),
    mincss       = require('gulp-minify-css'),
    del          = require('del'),
    openBrowser  = require('open'),
    uglify       = require('gulp-uglify'),
    reactify     = require('reactify'),
    rev          = require('gulp-rev'),
    template     = require('gulp-template')
    ;

var FILE_INDEX         = './src/index.html',
    FILE_JS_ENTRY      = './src/scripts/app.js',
    FILE_LESS_ENTRY    = './src/styles/app.less',
    FILE_JS_TARGET     = 'app.js',
    FILE_TARGET        = './dist',
    FILES_ALL_COMPILED = FILE_TARGET + '/**',
    FILES_HTML         = ['./src/*.html'],
    FILES_JS           = ['./src/scripts/*.js', './src/scripts/**/*.js'],
    FILES_LESS         = ['./src/styles/*.less', './src/styles/**/*.less']
    ;

var isProduction = (process.env.NODE_ENV === 'production');

// Tasks
gulp.task('clean',   clean(FILE_TARGET));
gulp.task('server',  startServer(FILE_TARGET));
gulp.task('lint',    function () { return lint(FILES_JS); });
gulp.task('styles',  function () { return styles(FILE_LESS_ENTRY, isProduction, FILE_TARGET + '/styles'); });
gulp.task('scripts', ['lint'], function () { return scripts(FILE_JS_ENTRY, isProduction, FILE_JS_TARGET, FILE_TARGET + '/scripts'); });
gulp.task('static',  ['scripts', 'styles'], function () { return compileStatic(FILE_INDEX, isProduction, FILE_TARGET); });
gulp.task('compile', ['static']);
gulp.task('default', ['compile']);
gulp.task('watch',   ['compile', 'server'], function () {
  gulp.watch(FILES_HTML, ['static']);
  gulp.watch(FILES_LESS, ['styles']);
  gulp.watch(FILES_JS,   ['scripts']);

  livereload.listen();
  gulp.watch(FILES_ALL_COMPILED).on('change', livereload.changed);
});

/** Cleans the target folder. */
function clean (folder) {
  return function (fn) {
    del(folder, fn);
  };
}

/** Hosts a development server and opens the browser. */
function startServer (folder) {
  return function () {
    var port = 3000;
    connect().use(serveStatic(folder)).listen(port);
    openBrowser('http://localhost:' + port);
  };
}

/** Lints the js and reports errors as os notifications. */
function lint (jsFiles) {
  var jshintNotifyOnError = notify(function (file) {
    if (file.jshint.success) {
      return false; // Don't show something if success
    }

    var errors = file.jshint.results.map(function (data) {
      if (data.error) {
        return "(" + data.error.line + ':' + data.error.character + ') ' + data.error.reason;
      }
    }).join("\n");
    return file.relative + " (" + file.jshint.results.length + " errors)\n" + errors;
  });

  return gulp.src(jsFiles)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshintNotifyOnError);
}

/** Compiles less. Minifies or creates source maps. */
function styles (lessEntryPoint, minify, targetFolder) {
  return gulp.src(lessEntryPoint)
    .pipe(gulpif(!minify, sourcemaps.init()))
    .pipe(less())
    .pipe(gulpif(!minify, sourcemaps.write()))
    .pipe(gulpif(minify, mincss({
      // https://github.com/jonathanepollack/gulp-minify-css
      noRebase: true,
      noAdvanced: true,
      compatibility: true
    })))
    .pipe(rev())
    .pipe(gulp.dest(targetFolder))
    .pipe(rev.manifest())
    .pipe(gulp.dest(targetFolder));
}

/** Compiles the html file. May include a <script> snippet in the body to support live reload. */
function compileStatic (indexFile, minify, targetFolder) {

  var cssManifest = require('./dist/styles/rev-manifest.json');
  var jsManifest  = require('./dist/scripts/rev-manifest.json');

  return gulp.src(indexFile)
    .pipe(gulpif(!minify, embedlr()))
    .pipe(gulpif(minify, template({
      appCss: 'styles/'  + cssManifest['app.css'],
      appJs:  'scripts/' + jsManifest['app.js'],
    })))
    .pipe(gulp.dest(targetFolder));
}

/** Compiles js with browserify. Minifies or creates sourcermaps. */
function scripts (browserifyEntryPoint, minify, jsTargetFile, targetFolder) {
  var props = {
      debug: !minify // source maps
  };
  var bundler = browserify(props);
  return bundler
    // https://github.com/sebastiandeutsch/es6ify-test/blob/master/browserify.js
    .transform(reactify)
    .add(es6ify.runtime)
    .transform(es6ify.configure(/^(?!.*node_modules)+.+\.js$/))
    .require(require.resolve(browserifyEntryPoint), { entry: true })
    .bundle()
    .pipe(source(jsTargetFile))
    .pipe(buffer())
    .pipe(gulpif(minify, uglify()))
    .pipe(rev())
    .pipe(gulp.dest(targetFolder))
    .pipe(rev.manifest())
    .pipe(gulp.dest(targetFolder));
}
