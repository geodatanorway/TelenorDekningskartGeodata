var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var icons = require('./map-icons');

var layers = [3, 7, 9];
var trondheim = L.latLng(63.430494, 10.395056);
var eventBus = new EventEmitter();
var InitialZoom = 6;
var CenterZoom = 12;
const AnimateDuration = 0.5;

var map = L.map('mapDiv', {
    zoomAnimationThreshold: 8,
    inertiaDeceleration: 3500 // by experimentation..
  })
  .setView(trondheim, InitialZoom, {
    animate: true,
    pan: { duration: AnimateDuration },
    klzoom: { duration: AnimateDuration }
  });

L.esri.basemapLayer('Streets').addTo(map);

var userLocationMarker, opts = { icon: icons.MyLocation };
map.locate({ setView: true, maxZoom: 14, enableHighAccuracy: true });
map.on('locationfound', e => {
  eventBus.emit('location:found');
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }
  userLocationMarker = L.marker(e.latlng, opts);
  userLocationMarker.addTo(map);
});
map.on('locationerror', e => {
  var code = e.code;
  var positionUnavailable = (code === 2);
  if (positionUnavailable) {
    eventBus.emit('location:denied');
  }
});
map.on('dragstart', () => {
  eventBus.emit('tracking:stop');
  map.stopLocate();
});

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
  token: GeodataToken,
  where: "1=1",
  pointToLayer: function (geojson, latlng) {
    return L.marker(latlng, { icon: icons.Wifi });
  }
});

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

  trackUser: () => {
    var zoom = map.getZoom();
    map.locate({ maxZoom: zoom, setView: true, watch: true, enableHighAccuracy: true });
  },

  stopTrackUser: () => {
    map.stopLocate();
  },

  centerAt: (lat, lon) => {
    map.setView(L.latLng(lat, lon), CenterZoom, {
      animate: true,
      pan: { duration: AnimateDuration },
      zoom: { duration: AnimateDuration }
    });
  },

  setWifiVisibility: (visible) => {
    if(visible)
      map.addLayer(wifiLayer);
    else
      map.removeLayer(wifiLayer);
  }

});
