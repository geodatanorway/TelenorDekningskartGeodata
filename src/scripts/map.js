var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var layers = [3, 7, 9];
var trondheim = L.latLng(63.430494, 10.395056);
var eventBus = new EventEmitter();
var map = L.map('mapDiv').setView(trondheim, 6);
L.esri.basemapLayer('Streets').addTo(map);

const GeodataUrl = "http://services.geodataonline.no/arcgis/rest/services/Geocache_UTM33_WGS84/GeocacheGraatone/MapServer";
const GeodataToken = "sg0Aq_ztEufQ6N-nw_NLkyRYRoQArMLOcLFPT77jzeKrqCbVdow5BAnbh6x-7lHs";
const DekningUrl = "http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap2/MapServer";
// var basemap = L.esri.tiledMapLayer(GeodataUrl, {
//   token: GeodataToken,
//   subdomains: ["s1", "s2", "s3", "s4", "s5"]
// });
// basemap.addTo(map);

var dekningLayer = L.esri.dynamicMapLayer(DekningUrl, {
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

var wifiLayer = L.esri.featureLayer(DekningUrl + "/10", {
  token: GeodataToken
});
wifiLayer.addTo(map);

module.exports = _.extend(eventBus, {
  Layers: {
    Out2G: 9,
    Out3G: 7,
    Out4G: 3,
    Out4GiPhone: 1,
    In2G: 8,
    In3G: 6,
    In4G: 2,
    In4GiPhone: 0
  },

  setLayers: (ids) => {
    dekningLayer.setLayers(ids);
  },

  centerAt: (lat, lon) => {
    map.setView(L.latLng(lat, lon), 12);
  }

});