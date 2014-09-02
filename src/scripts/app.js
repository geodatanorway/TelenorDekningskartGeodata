var map = require('./map');
map.on("map:load", () => {
  map.toggleLayer(3);
});

console.log(map);
