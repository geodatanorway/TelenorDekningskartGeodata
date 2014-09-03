var connect      = require('connect'),
	serveStatic  = require('serve-static');

connect().use(serveStatic(__dirname + "/dist")).listen(process.env.PORT || 3000);