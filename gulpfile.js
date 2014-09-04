var autoprefix  = require('gulp-autoprefixer'),
    browserify  = require('browserify'),
    buffer      = require('vinyl-buffer'),
    connect     = require('connect'),
    cache       = require('gulp-cache'),
    debug       = require('gulp-debug'),
    embedlr     = require('gulp-embedlr'),
    es6ify      = require('es6ify'),
    gulp        = require('gulp'),
    gulpif      = require('gulp-if'),
    imagemin    = require('gulp-imagemin'),
    jshint      = require('gulp-jshint'),
    less        = require('gulp-less'),
    livereload  = require('gulp-livereload'),
    mincss      = require('gulp-minify-css'),
    minhtml     = require('gulp-htmlmin'),
    notify      = require('gulp-notify'),
    openBrowser = require('open'),
    rev         = require('gulp-rev'),
    rimraf      = require('rimraf'),
    serveStatic = require('serve-static'),
    source      = require('vinyl-source-stream'),
    sourcemaps  = require('gulp-sourcemaps'),
    template    = require('gulp-template'),
    uglify      = require('gulp-uglify'),
    watchify    = require('watchify')
    ;

var FILES_SRC            = './src',
    FOLDER_JS            = FILES_SRC + '/scripts',
    FOLDER_LESS          = FILES_SRC + '/styles',
    FOLDER_IMAGES        = FILES_SRC + '/images',
    FILE_INDEX           = FILES_SRC + '/index.html',
    FILE_JS_ENTRY        = FOLDER_JS + '/app.js',
    FILE_LESS_ENTRY      = FOLDER_LESS + '/app.less',
    FILES_HTML           = [FILES_SRC     + '/*.html'],
    FILES_LESS           = [FOLDER_LESS   + '/*.less', FOLDER_LESS + '/**/*.less'],
    FILES_JS             = [FOLDER_JS     + '/*.js',   FOLDER_JS + '/**/*.js'],
    FILES_IMAGES         = [FOLDER_IMAGES + '/*',      FOLDER_IMAGES + '/**/*'],
    FILE_CSS_TARGET      = 'app.css',
    FILE_JS_TARGET       = 'app.js',
    FILE_CSS_URL         = 'styles/'  + FILE_CSS_TARGET,
    FILE_JS_URL          = 'scripts/' + FILE_JS_TARGET,
    FOLDER_TARGET        = './dist',
    FILES_ALL_COMPILED   = FOLDER_TARGET + '/**',
    FOLDER_CSS_TARGET    = FOLDER_TARGET + '/styles',
    FOLDER_JS_TARGET     = FOLDER_TARGET + '/scripts',
    FOLDER_IMAGES_TARGET = FOLDER_TARGET + '/images'
    ;

var isProduction = (process.env.NODE_ENV === 'production');

// Tasks
gulp.task('clean',      clean(FOLDER_TARGET));
gulp.task('server',     startServer(FOLDER_TARGET));
gulp.task('lint',       lint(FILES_JS, isProduction));
gulp.task('images',     images(FILES_IMAGES, isProduction, FOLDER_IMAGES_TARGET));
gulp.task('styles',     styles(FILE_LESS_ENTRY, isProduction, FILE_CSS_TARGET, FOLDER_CSS_TARGET));
gulp.task('static',              compileStatic(FILE_INDEX, isProduction, FOLDER_TARGET));
gulp.task('static-rev', ['rev'], compileStatic(FILE_INDEX, isProduction, FOLDER_TARGET));
gulp.task('scripts',    ['lint'], scripts(FILE_JS_ENTRY, isProduction, FILE_JS_TARGET, FOLDER_JS_TARGET));
gulp.task('scripts-w',  ['lint'], scripts(FILE_JS_ENTRY, isProduction, FILE_JS_TARGET, FOLDER_JS_TARGET, true));
gulp.task('rev',        ['scripts', 'styles'], revisions(FOLDER_TARGET, isProduction));
gulp.task('compile',    ['static-rev', 'images']);
gulp.task('default',    ['compile']);
gulp.task('watch',      ['scripts-w', 'images', 'styles', 'static', 'server'], function () {
  gulp.watch(FILES_HTML,   ['static']);
  gulp.watch(FILES_LESS,   ['styles']);
  gulp.watch(FILES_IMAGES, ['images']);

  livereload.listen();
  gulp.watch(FILES_ALL_COMPILED).on('change', livereload.changed);
});

/** Cleans the target folder. */
function clean (folder) {
  return function (fn) {
    rimraf(folder, fn);
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
  return function () {
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
      .pipe(gulpif(!isProduction, jshintNotifyOnError));
  };
}

function images (imageFiles, isProduction, targetFolder) {
  return function () {
    return gulp.src(imageFiles)
      .pipe(cache(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true })))
      .pipe(gulp.dest(targetFolder));
  };
}

/** Compiles less. Minifies or creates source maps. */
function styles (lessEntryPoint, minify, targetCssFile, targetFolder) {
  return function () {
    return gulp.src(lessEntryPoint)
      .pipe(gulpif(!minify, sourcemaps.init()))
      .pipe(gulpif(minify, less(), less().on('error', handleErrors('Less'))))
      .pipe(autoprefix({ map: !minify }))
      .pipe(gulpif(!minify, sourcemaps.write()))
      .pipe(gulpif(minify, mincss({
        // https://github.com/jonathanepollack/gulp-minify-css
        noRebase: true,
        noAdvanced: true,
        compatibility: true
      })))
      .pipe(gulp.dest(targetFolder));
  };
}

function revisions (targetFolder, minify) {
  return function (fn) {
    if (!minify) {
      // Don't add hashes to files names if we're not minifying
      fn();
      return;
    }

    return gulp.src([
        FOLDER_CSS_TARGET + '/' + FILE_CSS_TARGET,
        FOLDER_JS_TARGET + '/' + FILE_JS_TARGET
      ], { base: targetFolder })
      .pipe(rev())
      .pipe(gulp.dest(targetFolder))
      .pipe(rev.manifest())
      .pipe(gulp.dest(targetFolder));
  };
}

/** Compiles the html file. May include a <script> snippet in the body to support live reload. */
function compileStatic (indexFile, minify, targetFolder) {
  return function () {
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
        appCss: minify ? manifest[FILE_CSS_TARGET] : FILE_CSS_URL,
        appJs:  minify ? manifest[FILE_JS_TARGET]  : FILE_JS_URL,
      }))
      .pipe(gulpif(minify, minhtml({
        // https://github.com/jonschlinkert/gulp-htmlmin
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
      })))
      .pipe(gulp.dest(targetFolder));
  };
}

/** Compiles js with browserify. Minifies or creates sourcermaps. Watch uses browserify with watchify, which incrementally builds the browserified js files. */
function scripts (browserifyEntryPoint, minify, jsTargetFile, targetFolder, watch) {

  return function () {

    var bundler = browserify(es6ify.runtime, {
      debug: !minify, // source maps
      cache: {},
      packageCache: {},
      fullPaths: watch
    });

    if (watch) {
      bundler = watchify(bundler);
    }
    es6ify.traceurOverrides = {experimental: true, blockBinding: true};
    bundler
      // https://github.com/sebastiandeutsch/es6ify-test/blob/master/browserify.js
      .add(browserifyEntryPoint)
      .transform(es6ify.configure(/^(?!.*node_modules)+.+\.js$/))
      .on('update', rebundle);

    return rebundle();

    function rebundle () {
      var stream = bundler.bundle();
      return stream.on('error', handleErrors('Browserify'))
        .pipe(source(jsTargetFile))
        .pipe(buffer())
        .pipe(gulpif(minify, uglify()))
        .pipe(gulp.dest(targetFolder))
        .pipe(gulpif(watch, notify({ title: "Browserify", message: 'reloaded' })));
    }

  };
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
