var EventEmitter = require('events').EventEmitter,
    Bluebird     = require('bluebird'),
    NProgress    = require('nprogress'),
    _  = require('lodash');

require('leaflet');
require('./libs/esri-leaflet');
require('./libs/esri-leaflet-geocoder');
require('./libs/leaflet.markercluster-src');
require('./libs/esri-leaflet-clustered-feature-layer');

Bluebird.promisifyAll(L.esri.Tasks.IdentifyFeatures.prototype);
//Bluebird.longStackTraces();

var icons = require('./map-icons');

const GeodataUrl = "http://{s}.geodataonline.no/arcgis/rest/services/Geocache_WMAS_WGS84/GeocacheBasis/MapServer";

const isLocalhost = location.href.indexOf("localhost") !== -1;
const GeodataToken = isLocalhost ? "g5EAFnTvNcwXP5dxo-4Wl-VJCU2Rf0lVAQRuUxZ1HhFftNiecoMPhidDabLhMMwy" // test token (services)
                                 : "q_rPZCcz2VvkdBSKl-tbHc31C4mRhKKdqZQlXl4kaGrCyrkuHU4oasH28tN41YGrVaKQZaVms3xV4e4hbZM1Ag..";
const GeodataTokenServices2 = isLocalhost ? "PYFSdAYkj-XreaHpzG3drBoNLh7IKjAVOVSEk45mzqKq0qyaRCS7irlB9lya0TKr" // test token (services2)
                                          : "q_rPZCcz2VvkdBSKl-tbHc31C4mRhKKdqZQlXl4kaGrCyrkuHU4oasH28tN41YGrVaKQZaVms3xV4e4hbZM1Ag..";

const GeocodeUrl = "http://services2.geodataonline.no/arcgis/rest/services/Geosok/GeosokLokasjon2/GeocodeServer/reverseGeocode";
const GeocodeToken = GeodataTokenServices2;

const DekningUrl = "http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap_beck/MapServer";
const DekningToken = "sg0Aq_ztEufQ6N-nw_NLkyRYRoQArMLOcLFPT77jzeKrqCbVdow5BAnbh6x-7lHs";

const InitialZoom = 6;
const CenterZoom = 12;
const MaxZoom = 14;
const AnimateDuration = 0.5;
const MapViewOptions = { animate: true, pan:  { duration: AnimateDuration }, zoom: { duration: AnimateDuration } };

const MapClickedId = "MapClicked";
const BaseMapOpacity = 0.5;
const LayerOpacity = 0.5;


var eventBus = new EventEmitter();

var trondheim = L.latLng(63.430494, 10.395056);
var map = L.map('mapDiv', {
    zoomAnimationThreshold: 8,
    inertiaDeceleration: 3500, // by experimentation..
    continuousWorld: true,
    maxZoom: MaxZoom,
    minZoom: 4,
    maxBounds: [[46, -18],[82, 46]]
  })
  .setView(trondheim, InitialZoom, MapViewOptions);

var userLocationMarker;
map.locate({
  setView: true,
  maxZoom: InitialZoom,
  enableHighAccuracy: true
});

var trackingUserPosition = false;
function locate () {
  var zoom = map.getZoom();
  map.locate({
    maxZoom: zoom,
    setView: true,
    watch: true,
    enableHighAccuracy: true
  });

  trackingUserPosition = true;
  if (userLocationMarker) {
    userLocationMarker.setIcon(icons.UserLocationTracking);
  }
}

function stopLocate () {
  map.stopLocate();

  trackingUserPosition = false;
  if (userLocationMarker) {
    userLocationMarker.setIcon(icons.UserLocation);
  }
}

map.on('locationfound', e => {
  eventBus.emit('location:found');
  if (userLocationMarker) {
    userLocationMarker.setLatLng(e.latlng);
  }
  else {
    userLocationMarker = L.marker(e.latlng, { icon: trackingUserPosition ? icons.UserLocationTracking : icons.UserLocation });
    userLocationMarker.addTo(map);
  }
});

map.on('locationerror', e => {
  var code = e.code;
  var positionUnavailable = (code === 2);
  if (positionUnavailable) {
    eventBus.emit('location:denied');
  }

  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }
});

map.on('dragstart', () => {
  eventBus.emit('tracking:stop');
  eventBus.emit('drag');
  stopLocate();
});

var markers = {};

function setMarker(lat, lon, id, options, popupOptions) {
  options = _.extend({
    icon: icons.PlaceLocation
  }, options, true);

  deleteMarker(id);
  var marker = L.marker(L.latLng(lat, lon), options);
  map.addLayer(marker);
  markers[id] = marker;

  popupOptions = popupOptions || {};

  var popup = L.popup(popupOptions).setContent(options.title);
  marker.bindPopup(popup);
  return marker;
}

function deleteMarker(id) {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
}

function setLayers(layers) {
  var insideIds = [],
    outsideIds = [];

  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    if (layers.outside)
      outsideIds.push(layer);
    if (layers.inside)
      insideIds.push(layer - 1);
  }

  setLayerOpacity(LayerOpacity);

  inneDekningLayer.setLayers(insideIds);
  uteDekningLayer.setLayers(outsideIds);

  var isAtLeastOneLayerSelected = (outsideIds.length !== 0 || insideIds.length !== 0);
  if (isAtLeastOneLayerSelected) {
    basemap.setOpacity(BaseMapOpacity);
  }
  else {
    basemap.setOpacity(1);
  }
}

function setLayerOpacity(opacity) {
  inneDekningLayer.options.opacity = opacity;
  uteDekningLayer.options.opacity = opacity;
}

var thresholds = {
  "2G": { high: -78, low: -91, minimal: -94 },
  "3G": { high: -94, low: -96, minimal: -99 },
  "4G": { high: -100, low: -107, minimal: -110 },
};

var popupTimeout,
    hasOpenPopup = false,
    clickCanceled = false;

map.on('popupclose', () => setTimeout(closePopup, 0)); // delay til after map receives click
map.on("dblclick", e => clickCanceled = true);
map.on("click", e => {
  if (hasOpenPopup) {
    closePopup();

    if (popupTimeout) {
      clearTimeout(popupTimeout);
      popupTimeout = null;
    }
    return;
  }

  clickCanceled = false;
  popupTimeout = setTimeout(() => {
    if (!clickCanceled) {
      showGeocodePopup(e.latlng);
    }
  }, 250);
});

function closePopup () {
  hasOpenPopup = false;
  deleteMarker(MapClickedId);
}

var basemap = L.esri.tiledMapLayer(GeodataUrl, {
  opacity: BaseMapOpacity,
  token: GeodataToken,
  subdomains: ["s1", "s2", "s3", "s4", "s5"],
});
basemap.addTo(map);

var uteDekningLayer = createDekningLayer();
var inneDekningLayer = createDekningLayer();
uteDekningLayer.addTo(map);
inneDekningLayer.addTo(map);

var initialLayers = [3];
initialLayers.outside = true;
initialLayers.inside = false;
setLayers(initialLayers);

var wifiLayer = L.esri.clusteredFeatureLayer(DekningUrl + "/10", {
  token: DekningToken,
  where: "1=1",
  useCors: false,
  pointToLayer: (geojson, latlng) => {
    return L.marker(latlng, { icon: icons.WifiLocation });
  }
});
wifiLayer.bindPopup(features => features.properties.NAVN_WEB);

// Extend EventBus so we can both subscribe to events and perform additional methods.
module.exports = _.extend(eventBus, {

  Layers: {
    Out2G: 9,
    Out3G: 7,
    Out4G: 3
  },

  showGeocodePopup: showGeocodePopup,

  setLayers: setLayers,

  trackUser: locate,

  stopTrackUser: stopLocate,

  centerAt: (lat, lon) => map.setView(L.latLng(lat, lon), CenterZoom, MapViewOptions),

  setMarker: setMarker,

  setWifiVisibility: (visible) => {
    if (visible) {
      map.addLayer(wifiLayer);
      map.options.maxZoom = 18;
    } else {
      map.removeLayer(wifiLayer);
      map.options.maxZoom = MaxZoom;
      if (map.getZoom() > MaxZoom)
        map.setZoom(MaxZoom);
    }
  }
});

function createDekningLayer() {
  var layer = L.esri.dynamicMapLayer(DekningUrl, { opacity: LayerOpacity, token: DekningToken });
  layer.on("loading", event => eventBus.emit("loading"));
  layer.on("load", event => eventBus.emit("load"));
  return layer;
}

function getDekning(db, threshold){
  if(!db || db === 0)
    return "Ingen dekning";
  if(db > threshold.high)
    return "Meget god";
  if(db > threshold.low)
    return "God";
  if(db > threshold.minimal)
    return "Minimal";
  return "Ingen dekning";
}

function getForventetDekning(db2g, db3g, db4g) {
  var dekning4G = getDekning(db4g, thresholds["4G"]);
  var dekning3G = getDekning(db3g, thresholds["3G"]);
  var dekning2G = getDekning(db2g, thresholds["2G"]);
  return [dekning4G, dekning3G, dekning2G].join("<br>");
}

function showGeocodePopup(latlng) {
  closePopup();

  NProgress.start();
  var loc = {
    x: latlng.lng,
    y: latlng.lat,
    spatialReference: { wkid: 4326 }
  };

  var reverseLookup = reverseLookupAsync(loc, { outSR: 3857 });

  var identify = L.esri.Tasks.identifyFeatures(DekningUrl)
    .on(map)
    .token(DekningToken)
    .at(latlng)
    .layers('all:3,7,9')
    .runAsync()
    .spread((featureCollection, response) => {
      return _.zip(featureCollection.features, response.results).map((results) => {
        var feature = results[0];
        var point = results[1];
        var db = parseInt(point.attributes.DB_LEVEL || point.attributes["Pixel Value"]);
        var layerName = getLayerName(point.layerId);
        return layerName + ": " + getDekning(db, thresholds[layerName]);
      }).join("<br>");
    }, error => "Ingen signalinformasjon funnet");

  Bluebird.join(reverseLookup, identify, (lookupInfo, signalInfo) => {
    NProgress.done();
    var popupText = (lookupInfo ? lookupInfo + "<br><br>" : "") + "Forventet dekning:<br>" + signalInfo +
      "<br><br><a href='http://www.telenor.no/privat/mobil/mobiltjenester/datapakker/' target='_blank'>Kjøp mer data eller hastighet</a>";

    setMarker(latlng.lat, latlng.lng, MapClickedId, {
      title: popupText,
      icon: icons.PlaceLocation
    }).openPopup();
    hasOpenPopup = true;
  });
}

var geocoding = new L.esri.Services.Geocoding(GeocodeUrl, { token: GeocodeToken });

function reverseLookupAsync(location, options) {
  return new Promise((resolve, reject) => {
    geocoding.reverse(location, options, (error, result, response) => {
      var popupText = "";
      if (!error) {
        var address = response.address;
        if (address.Adresse)
          popupText += address.Adresse + "<br>";
        popupText += address.Postnummer + " " + address.Poststed;
      }
      resolve(popupText);
    });
  });
}

function getLayerName(layerId) {
  switch (layerId) {
    case 2: return "4G innendørs";
    case 3: return "4G";
    case 6: return "3G innendørs";
    case 7: return "3G";
    case 8: return "2G innendørs";
    case 9: return "2G";
    default: return "Ukjent";
  }
}
