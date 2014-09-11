var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var L = require('./libs/esri-leaflet');
L = require('./libs/esri-leaflet-geocoder');

var icons = require('./map-icons');
require('./lodash-plugins');

// const GeodataUrl = "http://services.geodataonline.no/arcgis/rest/services/temp/GeocacheBasis_3857/MapServer";
const GeodataToken = "pfXkUmlA3PLW3haAGWG5vwGW69TFhN3k1ISHYSpTZhhMFWsPpE76xOqMKG5uYw_U";
const GeodataUrl = "http://{s}.geodataonline.no/arcgis/rest/services/Geocache_WMAS_WGS84/GeocacheBasis/MapServer";

const GeocodeUrl = "http://services2.geodataonline.no/arcgis/rest/services/Geosok/GeosokLokasjon2/GeocodeServer/reverseGeocode";
const GeocodeToken = "YNwBZNct1SXVxPMi7SawmggygE-k2q43VNUgC0gutZyfHgCkezgZ6oPKSILtP1op";

const DekningUrl = "http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap2/MapServer";
const DekningToken = "sg0Aq_ztEufQ6N-nw_NLkyRYRoQArMLOcLFPT77jzeKrqCbVdow5BAnbh6x-7lHs";

const InitialZoom = 6;
const CenterZoom = 12;
const MaxZoom = 14;
const AnimateDuration = 0.5;
const Opacity = 0.3;
const SingleOpacity = 0.5;
var initialLayers = [3];
initialLayers.outside = true;
initialLayers.inside = false;
var trondheim = L.latLng(63.430494, 10.395056);
var eventBus = new EventEmitter();
var markers = {};


var map = L.map('mapDiv', {
    zoomAnimationThreshold: 8,
    inertiaDeceleration: 3500, // by experimentation..
    continuousWorld: true,
    maxZoom: MaxZoom,
    minZoom: 4,
    maxBounds: [[56, -4],[72, 40]]
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


var geocoding = new L.esri.Services.Geocoding(GeocodeUrl, {
  token: GeocodeToken
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

function setLayerOpacity (opacity) {
  inneDekningLayer.options.opacity = opacity;
  uteDekningLayer.options.opacity = opacity;
}

function setLayers(layers) {
  var insideIds = [], outsideIds = [];

  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    if(layers.outside)
      outsideIds.push(layer);
    if(layers.inside)
      insideIds.push(layer - 1);
  }

  if(layers.inside !== layers.outside){
    setLayerOpacity(SingleOpacity);
  } else {
    setLayerOpacity(Opacity);
  }

  inneDekningLayer.setLayers(insideIds);
  uteDekningLayer.setLayers(outsideIds);
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


function createDekningLayer() {
  var layer = L.esri.dynamicMapLayer(DekningUrl, {
    opacity: Opacity,
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
  useCors: false,
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
    Out4G: 3
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