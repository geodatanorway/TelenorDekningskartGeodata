var map = require('./map');
map.on("map:load", function(){
	debugger;
	map.toggleLayer(3);
});
