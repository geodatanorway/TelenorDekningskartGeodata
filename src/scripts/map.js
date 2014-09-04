var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var layers = [3, 7, 9];
var trondheim = L.latLng(63.430494, 10.395056);
var eventBus = new EventEmitter();
var map = L.map('mapDiv').setView(trondheim, 6);
L.esri.basemapLayer('Streets').addTo(map);

const GeodataUrl = "http://services.geodataonline.no/arcgis/rest/services/Geocache_UTM33_WGS84/GeocacheGraatone/MapServer";
const GeodataToken = "sg0Aq_ztEufQ6N-nw_NLkyRYRoQArMLOcLFPT77jzeKrqCbVdow5BAnbh6x-7lHs";

// var basemap = L.esri.tiledMapLayer(GeodataUrl, {
//   token: GeodataToken,
//   subdomains: ["s1", "s2", "s3", "s4", "s5"]
// });
// basemap.addTo(map);

var dekningLayer = L.esri.dynamicMapLayer("http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap2/MapServer", {
  opacity: 0.5,
  token: GeodataToken,
  layers: layers,
});
dekningLayer.on("loading", event => {
  eventBus.emit("loading");
});
dekningLayer.on("load", event => {
  eventBus.emit("load");
});
dekningLayer.addTo(map);


module.exports = _.extend(eventBus, {
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
    map.setView(L.latLng(lat, lon), 12);
  }

});