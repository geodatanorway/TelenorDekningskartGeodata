var connect     = require('connect'),
    fs          = require('fs'),
    path        = require('path'),
    mime        = require('mime'),
    serveStatic = require('serve-static'),
    compression = require('compression');

var oneDay = 86400000,
    oneYear = oneDay * 365;

var PORT = process.env.PORT || 3000;

connect()
  .use(compression())
  .use(serveAppZipWithoutCache)
  .use(serveStatic(__dirname + "/dist", { maxAge: oneYear }))
  .listen(PORT, function () {
    console.log(' listening on', PORT);
  });

function serveAppZipWithoutCache (req, res, next) {
  if (req.url !== '/app.zip') return next();
  var file = __dirname + '/dist/app.zip';

  // don't cache it
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '-1');

  // download it
  res.setHeader('Content-disposition', 'attachment; filename=' + path.basename(file));
  res.setHeader('Content-type', mime.lookup(file));

  fs.createReadStream(file).pipe(res);
}
