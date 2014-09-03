var browserify   = require('browserify'),
    buffer       = require('vinyl-buffer'),
    connect      = require('connect'),
    debug        = require('gulp-debug'),
    del          = require('del'),
    embedlr      = require('gulp-embedlr'),
    es6ify       = require('es6ify'),
    gulp         = require('gulp'),
    gulpif       = require('gulp-if'),
    jshint       = require('gulp-jshint'),
    less         = require('gulp-less'),
    livereload   = require('gulp-livereload'),
    mincss       = require('gulp-minify-css'),
    notify       = require('gulp-notify'),
    openBrowser  = require('open'),
    rev          = require('gulp-rev'),
    serveStatic  = require('serve-static'),
    source       = require('vinyl-source-stream'),
    sourcemaps   = require('gulp-sourcemaps'),
    template     = require('gulp-template'),
    uglify       = require('gulp-uglify'),
    watchify     = require('watchify')
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
gulp.task('clean',     clean(FILE_TARGET));
gulp.task('server',    startServer(FILE_TARGET));
gulp.task('lint',      function () { return lint(FILES_JS, isProduction); });
gulp.task('styles',    function () { return styles(FILE_LESS_ENTRY, isProduction, FILE_TARGET + '/styles'); });
gulp.task('scripts',   ['lint'], function () { return scripts(FILE_JS_ENTRY, isProduction, FILE_JS_TARGET, FILE_TARGET + '/scripts'); });
gulp.task('scripts-w', ['lint'], function () { return scripts(FILE_JS_ENTRY, isProduction, FILE_JS_TARGET, FILE_TARGET + '/scripts', true); });
gulp.task('rev',     ['scripts', 'styles'], function () { return revisions(FILE_TARGET, isProduction); });
gulp.task('static',  ['rev'], function () { return compileStatic(FILE_INDEX, isProduction, FILE_TARGET); });
gulp.task('compile', ['static']);
gulp.task('default', ['compile']);
gulp.task('watch',   ['scripts-w', 'styles', 'server'], function () {
  gulp.watch(FILES_HTML, ['static']);
  gulp.watch(FILES_LESS, ['styles']);

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
function lint (jsFiles, isProduction) {
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
    .pipe(gulpif(isProduction, jshintNotifyOnError));
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
    .pipe(gulp.dest(targetFolder));
}

function revisions (targetFolder, minify) {
  if (!minify) {
    // Don't add hashes to files names if we're not minifying
    return function (fn) { fn(); };
  }

  return gulp.src([
      "./dist/styles/app.css",
      "./dist/scripts/app.js"
    ], { base: targetFolder })
    .pipe(rev())
    .pipe(gulp.dest(targetFolder))
    .pipe(rev.manifest())
    .pipe(gulp.dest(targetFolder));
}

/** Compiles the html file. May include a <script> snippet in the body to support live reload. */
function compileStatic (indexFile, minify, targetFolder) {
  var manifest;

  if (minify) {
    manifest = require("./dist/rev-manifest.json");
    for (var key in manifest) {
      // replace full path in key, so only app.js and app.css are left
      var newkey = key.replace(/.*\//, "");
      manifest[newkey] = manifest[key];
      delete manifest[key];
    }
  }

  return gulp.src(indexFile)
    .pipe(gulpif(!minify, embedlr()))
    .pipe(template({
      appCss: minify ? manifest['app.css'] : 'styles/app.css',
      appJs:  minify ? manifest['app.js']  : 'scripts/app.js',
    }))
    .pipe(gulp.dest(targetFolder));
}

/** Compiles js with browserify. Minifies or creates sourcermaps. Watch uses browserify with watchify, which incrementally builds the browserified js files. */
function scripts (browserifyEntryPoint, minify, jsTargetFile, targetFolder, watch) {

  var bundler = browserify(browserifyEntryPoint, {
    debug: !minify, // source maps
    cache: {},
    packageCache: {},
    fullPaths: watch
  });

  if (watch) {
    bundler = watchify(bundler);
  }

  bundler
    // https://github.com/sebastiandeutsch/es6ify-test/blob/master/browserify.js
    .add(es6ify.runtime)
    .transform(es6ify.configure(/^(?!.*node_modules)+.+\.js$/))
    .on('update', rebundle);

  return rebundle();

  function rebundle () {
    var stream = bundler.bundle();
    return stream.on('error', handleErrors('Browserify'))
      .pipe(source(jsTargetFile))
      .pipe(buffer())
      .pipe(gulpif(minify, uglify()))
      .pipe(gulp.dest(targetFolder));
  }

  function handleErrors (description) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      notify.onError({
          title: description + " error",
          message: "<%= error.message %>"
        }).apply(this, args);
      this.emit('end'); // Keep gulp from hanging on this task
    };
  }
}
