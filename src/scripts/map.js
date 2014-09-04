var layers = [3, 7, 9];
var trondheim = L.latLng(63.430494, 10.395056);

var map = L.map('mapDiv').setView(trondheim, 9);
L.esri.basemapLayer('Topographic').addTo(map);

var dekningLayer = L.esri.dynamicMapLayer("http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap2/MapServer", {
  opacity: 0.4,
  token: "sg0Aq_ztEufQ6N-nw_NLkyRYRoQArMLOcLFPT77jzeKrqCbVdow5BAnbh6x-7lHs",
  layers: layers
});
dekningLayer.addTo(map);

module.exports.toggleLayer = id => {
  var index = layers.indexOf(id);
  if(index < 0){
    layers.push(id);
  } else {
    layers.splice(index, 1);
  }
  dekningLayer.setLayers(layers);
};

module.exports.centerAt = (lat, lon) => {
  map.setView(L.latLng(lat, lon));
};
