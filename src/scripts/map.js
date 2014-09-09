var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var L = require('./libs/esri-leaflet');
require('./libs/esri-leaflet-geocoder');

var icons = require('./map-icons');
require('./lodash-plugins');

var layers = [3];
var trondheim = L.latLng(63.430494, 10.395056);
var eventBus = new EventEmitter();
var InitialZoom = 6;
var CenterZoom = 12;
var markers = {};
const AnimateDuration = 0.5;


var map = L.map('mapDiv', {
    zoomAnimationThreshold: 8,
    inertiaDeceleration: 3500, // by experimentation..
    continuousWorld: true,
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

L.esri.basemapLayer('Streets').addTo(map);

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

var clickCanceled = false;

function showGeocodePopup(latlng) {

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

    setMarker(latlng.lat, latlng.lng, "MapClicked", {
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

// basemap.addTo(map);

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

var dekningLayer2 = L.esri.dynamicMapLayer(DekningUrl, {
  opacity: 0.5,
  token: DekningToken,
  layers: [2],
});
dekningLayer2.on("loading", event => {
  eventBus.emit("loading");
});
dekningLayer2.on("load", event => {
  eventBus.emit("load");
});

dekningLayer.addTo(map);
dekningLayer2.addTo(map);

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

  setLayers: (ids) => {  
    if (ids.length === 0) {
        dekningLayer.setLayers([]);
        dekningLayer2.setLayers([]);
        return;
    }

    if (ids[0].outside === true && ids[0].inside === true) {
        dekningLayer.setLayers([ids[0].id]);
        
        var id = ids[0].id - 1
        dekningLayer2.setLayers([id]);
    }
    
    if (ids[0].inside === true && ids[0].outside === false) {
        dekningLayer.setLayers([]);
        var id = ids[0].id - 1
        dekningLayer2.setLayers([id]);
    }
    if (ids[0].inside === false && ids[0].outside === true){
        dekningLayer2.setLayers([]);
        dekningLayer.setLayers([ids[0].id]);
    }
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

  setMarker: setMarker,

  setWifiVisibility: (visible) => {
    if (visible)
      map.addLayer(wifiLayer);
    else
      map.removeLayer(wifiLayer);
  }

});