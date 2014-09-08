var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var L = require('leaflet');
require('esri-leaflet');

var icons = require('./map-icons');

var layers = [3];
var trondheim = L.latLng(63.430494, 10.395056);
var eventBus = new EventEmitter();
var InitialZoom = 6;
var CenterZoom = 12;
var markers = {};
const AnimateDuration = 0.5;


// var crs = new L.Proj.CRS.TMS('EPSG:32633', 
//   '+proj=utm +zone=33 +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
//   [-3708422.027733366,
//   3479849.9390820344,
//   4766389.588614912,
//   9997963.943018204], {
//     resolutions: [
//       21674.7100160867,
//       10837.35500804335,
//       5418.677504021675,
//       2709.3387520108377,
//       1354.6693760054188,
//       677.3346880027094,
//       338.6673440013547,
//       169.33367200067735,
//       84.66683600033868,
//       42.33341800016934,
//       21.16670900008467,
//       10.583354500042335,
//       5.291677250021167,
//       2.6458386250105836,
//       1.3229193125052918,
//       0.6614596562526459,
//       0.33072982812632296,
//       0.16536491406316148
//       ]
//   });


var map = L.map('mapDiv', {
    zoomAnimationThreshold: 8,
    inertiaDeceleration: 3500, // by experimentation..
    continuousWorld: true,
    // crs: crs,
    maxZoom: 13
  })
  .setView(trondheim, InitialZoom, {
    animate: true,
    pan: {
      duration: AnimateDuration
    },
    zoom: {
      duration: AnimateDuration
    }
  });

// L.esri.basemapLayer('Streets').addTo(map);

var userLocationMarker, opts = {
  icon: icons.MyLocation
};
map.locate({
  setView: true,
  maxZoom: 14,
  enableHighAccuracy: true
});
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
  eventBus.emit('drag');
  map.stopLocate();
});

// const GeodataUrl = "http://{s}.geodataonline.no/arcgis/rest/services/temp/GeocacheGraatone_32633/MapServer/tile/{z}/{x}/{y}";
// const GeodataUrl = "http://services.geodataonline.no/arcgis/rest/services/Geocache_UTM33_WGS84/GeocacheGraatone/MapServer";
// const GeodataUrl = "http://{s}.geodataonline.no/arcgis/rest/services/Geocache_WMAS_WGS84/GeocacheBasis/MapServer";
const GeodataUrl = "http://services.geodataonline.no/arcgis/rest/services/temp/GeocacheBasis_3857/MapServer";
const GeodataToken = "pfXkUmlA3PLW3haAGWG5vwGW69TFhN3k1ISHYSpTZhhMFWsPpE76xOqMKG5uYw_U";

const DekningToken = "sg0Aq_ztEufQ6N-nw_NLkyRYRoQArMLOcLFPT77jzeKrqCbVdow5BAnbh6x-7lHs";
const DekningUrl = "http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap2/MapServer";


var basemap = L.esri.tiledMapLayer(GeodataUrl, {
  token: GeodataToken,
  subdomains: ["s1", "s2", "s3", "s4", "s5"],
  // tms: true
});
basemap.addTo(map);

// var basemap = L.tileLayer(GeodataUrl, {
//   tms: true,
//   subdomains: ["s1", "s2", "s3", "s4", "s5"],
// }).addTo(map);

var dekningLayer = L.esri.dynamicMapLayer(DekningUrl, {
  opacity: 0.5,
  token: DekningToken,
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
  token: DekningToken,
  where: "1=1",
  pointToLayer: function(geojson, latlng) {
    return L.marker(latlng, {
      icon: icons.Wifi
    });
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
    map.locate({
      maxZoom: zoom,
      setView: true,
      watch: true,
      enableHighAccuracy: true
    });
  },

  stopTrackUser: () => {
    map.stopLocate();
  },

  centerAt: (lat, lon) => {
    map.setView(L.latLng(lat, lon), CenterZoom, {
      animate: true,
      pan: {
        duration: AnimateDuration
      },
      zoom: {
        duration: AnimateDuration
      }
    });
  },

  setMarker: (lat, lon, id, options)  => {
    if (markers[id]) {
      map.removeLayer(markers[id]);
      delete markers[id];
    }

    var marker = L.marker(L.latLng(lat, lon), options);
    markers[id] = marker;
    map.addLayer(marker);
  },

  setWifiVisibility: (visible) => {
    if (visible)
      map.addLayer(wifiLayer);
    else
      map.removeLayer(wifiLayer);
  }

});
