var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var L = require('./libs/esri-leaflet');
require('./libs/esri-leaflet-geocoder');

var icons = require('./map-icons');
require('./lodash-plugins');

const InitialZoom = 6;
const CenterZoom = 12;
const MaxZoom = 14;
const AnimateDuration = 0.5;
var initialLayers = [3];
var trondheim = L.latLng(63.430494, 10.395056);
var eventBus = new EventEmitter();
var markers = {};


var map = L.map('mapDiv', {
    zoomAnimationThreshold: 8,
    inertiaDeceleration: 3500, // by experimentation..
    continuousWorld: true,
    maxZoom: MaxZoom
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


var userLocationMarker, opts = {
  icon: icons.MyLocation
};
map.locate({
  setView: true,
  maxZoom: InitialZoom,
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

const GeodataUrl = "http://{s}.geodataonline.no/arcgis/rest/services/Geocache_WMAS_WGS84/GeocacheBasis/MapServer";
//const GeodataUrl = "http://services.geodataonline.no/arcgis/rest/services/temp/GeocacheBasis_3857/MapServer";
const GeodataToken = "pfXkUmlA3PLW3haAGWG5vwGW69TFhN3k1ISHYSpTZhhMFWsPpE76xOqMKG5uYw_U";

const GeocodeUrl = "http://services2.geodataonline.no/arcgis/rest/services/Geosok/GeosokLokasjon2/GeocodeServer/reverseGeocode";

const DekningToken = "sg0Aq_ztEufQ6N-nw_NLkyRYRoQArMLOcLFPT77jzeKrqCbVdow5BAnbh6x-7lHs";
const DekningUrl = "http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap2/MapServer";


var geocoding = new L.esri.Services.Geocoding(GeocodeUrl, {
  token: "YNwBZNct1SXVxPMi7SawmggygE-k2q43VNUgC0gutZyfHgCkezgZ6oPKSILtP1op"
});

function setMarker(lat, lon, id, options) {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }

  options = _.extend({
    icon: icons.SearchLocation
  }, options, true);

  var marker = L.marker(L.latLng(lat, lon), options);
  markers[id] = marker;
  map.addLayer(marker);
  marker.bindPopup(options.title);
  return marker;
}

function setLayers(ids) {
  uteDekningLayer.setLayers(ids);
  inneDekningLayer.setLayers(_(ids).map(id => id - 1));
}

var clickCanceled = false;

function showGeocodePopup(latlng) {
  const MapClickedId = "MapClicked";

  if (markers[MapClickedId]) {
    map.removeLayer(markers[MapClickedId]);
    delete markers[MapClickedId];
    return;
  }

  var location = {
    x: latlng.lng,
    y: latlng.lat,
    spatialReference: {
      wkid: 4326
    }
  };
  var options = {
    outSR: 3857
  };

  geocoding.reverse(location, options, (error, result, response) => {

    var popupText = "";
    if (error)
      popupText = "Ingen adresse funnet";
    else {
      var address = response.address;
      if (address.Adresse)
        popupText += address.Adresse + "<br>";
      popupText += address.Postnummer + " " + address.Poststed;
    }

    setMarker(latlng.lat, latlng.lng, MapClickedId, {
      title: popupText,
      icon: icons.ClickLocation
    }).openPopup();
  });
}

map.on("click", e => {
  clickCanceled = false;
  setTimeout(() => {
    if (!clickCanceled) {
      showGeocodePopup(e.latlng);
    }
  }, 250);
});

map.on("dblclick", e => {
  clickCanceled = true;
});

var basemap = L.esri.tiledMapLayer(GeodataUrl, {
  token: GeodataToken,
  subdomains: ["s1", "s2", "s3", "s4", "s5"],
});

basemap.addTo(map);
//L.esri.basemapLayer('Streets').addTo(map);

var opacity = 0.25;

function createDekningLayer() {
  var layer = L.esri.dynamicMapLayer(DekningUrl, {
    opacity: opacity,
    token: DekningToken
  });
  layer.on("loading", event => {
    eventBus.emit("loading");
  });
  layer.on("load", event => {
    eventBus.emit("load");
  });
  return layer;
}

var uteDekningLayer = createDekningLayer();
var inneDekningLayer = createDekningLayer();

setLayers(initialLayers);

uteDekningLayer.addTo(map);
inneDekningLayer.addTo(map);

var wifiLayer = L.esri.featureLayer(DekningUrl + "/10", {
  token: DekningToken,
  where: "1=1",
  pointToLayer: function(geojson, latlng) {
    return L.marker(latlng, {
      icon: icons.Wifi
    });
  }
});
wifiLayer.bindPopup(features => {
  return features.properties.NAVN_WEB;
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

  setLayers: setLayers,

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