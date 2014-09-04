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

module.exports = {
  Mobile2G: 9,
  Mobile3G: 7,
  Mobile4G: 3,
  toggleLayer: id => {
    var index = layers.indexOf(id);
    if (index < 0) {
      layers.push(id);
    } else {
      layers.splice(index, 1);
    }
    dekningLayer.setLayers(layers);
  },

  setLayerVisible: (id, visible) => {
    var index = layers.indexOf(id);
    if (index < 0 && visible) {
      layers.push(id);
    } else if (index >= 0 && !visible) {
      layers.splice(index, 1);
    }
    dekningLayer.setLayers(layers);
  },

  centerAt: (lat, lon) => {
    map.setView(L.latLng(lat, lon));
  }

};