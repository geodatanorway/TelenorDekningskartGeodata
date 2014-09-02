var map = require('./map');
map.on("map:load", function(){
	map.toggleLayer(3);
});

console.log(map);
