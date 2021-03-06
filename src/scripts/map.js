var fs = require('fs');

var EventEmitter = require('events').EventEmitter,
    Bluebird     = require('bluebird'),
    NProgress    = require('nprogress'),
    $  = require('zepto-browserify').$,
    _  = require('lodash');

var MobilePopup = require('./mobile-popup'),
    matchmedia = require('./libs/match-media');

var dekningPopupTemplate = _.template(fs.readFileSync(__dirname + "/../templates/dekning-popup.html", "utf-8"));

require('leaflet');
require('./libs/esri-leaflet');
require('./libs/esri-leaflet-geocoder');
require('./libs/leaflet.markercluster-src');
require('./libs/esri-leaflet-clustered-feature-layer');
require('./telenor-leaflet-popup.js');

Bluebird.promisifyAll(L.esri.Tasks.IdentifyFeatures.prototype);
//Bluebird.longStackTraces();

var icons = require('./map-icons');

const GeodataUrl = "http://{s}.geodataonline.no/arcgis/rest/services/Geocache_WMAS_WGS84/GeocacheBasis/MapServer";
const GeocodeUrl = "http://services2.geodataonline.no/arcgis/rest/services/Geosok/GeosokLokasjon2/GeocodeServer/reverseGeocode";

const isLocalhost = location.href.indexOf("localhost") !== -1;
const GeodataToken = isLocalhost ? "pmX2mkImLSYYAslhZGsMP4BMd6LvaSyqAFbUFSpcX0o." // test token (services)
                                 : "pmX2mkImLSYYAslhZGsMP4BMd6LvaSyqAFbUFSpcX0o.";
const GeocodeToken = isLocalhost ? "pmX2mkImLSYYAslhZGsMP4BMd6LvaSyqAFbUFSpcX0o." // test token (services2)
                                 : "pmX2mkImLSYYAslhZGsMP4BMd6LvaSyqAFbUFSpcX0o.";

const DekningUrl = "http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap_beck_v2/MapServer";
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
      outsideIds.push(layer - 2);
    if (layers.inside)
      insideIds.push(layer);
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
function setWidthOnDekningModule(numberOfModules) {
        switch(numberOfModules) {
            case 1:
                $(".dekning-module").addClass('full-width');
                break;
            case 2:
                $(".dekning-module").addClass('half-width');
                break;
            case 3:
                $(".dekning-module").addClass('third-width'); 
                break;
        }
    }

var thresholds = {
  "2g": { high: -78, low:  -86, minimal:  -94 },
  "3g": { high: -83, low:  -91, minimal:  -99 },
  "4g": { high: -94, low: -102, minimal: -110 },
};

var popupTimeout,
    hasOpenPopup = false,
    clickCanceled = false;

map.on('popupclose', () => setTimeout(closePopup, 0)); // delay til after map receives click
map.on('popupopen', function(e) {
    var numberOfDekning = $(".dekning-module").length;
    if (numberOfDekning)
        setWidthOnDekningModule(numberOfDekning);
});


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

  MobilePopup.on('close', closePopup);
  

function closePopup () {
  hasOpenPopup = false;
  MobilePopup.close();
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

var initialLayers = [2,5,8];
initialLayers.outside = true;
initialLayers.inside = false;
setLayers(initialLayers);

var Layers = {
  Dekning4G: 0,
  God4G: 1,
  MegetGod4G: 2,
  Dekning3G: 3,
  God3G: 4,
  MegetGod3G: 5,
  Dekning2G: 6,
  God2G: 7,
  MegetGod2G: 8,
  Wifi: 9,
  InsideNorway: 10
};

var wifiLayer = L.esri.clusteredFeatureLayer(DekningUrl + "/" + Layers.Wifi, {
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

  Layers: Layers,

  showGeocodePopup: showGeocodePopup,

  setLayers: setLayers,

  trackUser: locate,

  stopTrackUser: stopLocate,

  centerAt: (lat, lon) => map.setView(L.latLng(lat, lon), CenterZoom, MapViewOptions),

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

function getDekning(network, db, threshold){
  if(!db || db >= 0)
    return { network: network, text: "Ingen dekning", available: false };
  if(db > threshold.high)
    return { network: network, text: "Meget god", available: true, high: true };
  if(db > threshold.low)
    return { network: network, text: "God", available: true, low: true };
  if(db > threshold.minimal)
    return { network: network, text: "Basis", available: true, minimal: true };
  return { network: network, text: "Ingen dekning", available: false };
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
    .layers('all:' + [Layers.Dekning4G,
                      Layers.Dekning3G,
                      Layers.Dekning2G,
                      Layers.InsideNorway].join(','))
    .runAsync()
    .spread((featureCollection, response) => {
      var results = _.zip(featureCollection.features, response.results);

      var responseForInsideNorwayLayer = _(response.results).filter(filterGeometryPoints).any(hasResponseFromInsideNorway);

      return results.reduce((acc, results) => {
        var feature = results[0];
        var point = results[1];
        var pixelValue = (point.DB_VALUE || point.attributes["Pixel Value"]);
        var db = parseInt(pixelValue);
        var clickWasOutsideOfNorway = (!responseForInsideNorwayLayer || point.layerId === Layers.InsideNorway && db !== 999); // layer 10 will always have pixelValue 999 inside the borders of Norway, outside its not present
        if (clickWasOutsideOfNorway) {
          acc.outsideOfNorway = true;
        }
        else {
          var layerName = getLayerName(point.layerId);
          acc[point.layerId] = getDekning(layerName, db, thresholds[layerName]);
        }
        return acc;
      }, { outsideOfNorway: !responseForInsideNorwayLayer });
    }, error => {
      console.error('identify features failed: has the token expired?', error);
      return { error: "Henting av signalinformasjon feilet." };
    });

  Bluebird.join(reverseLookup, identify, (lookupInfo, signalInfo) => {
    NProgress.done();

    function isAvailable (info) {
      return info.available;
    }

    var isMobile = matchmedia('only screen and (max-width: 736px)').matches;

    var templateData = {
      mobile: isMobile,
      streetName: lookupInfo.text,
      adresseError: lookupInfo.error,
      signalError: signalInfo.error,
      coverage: _.any(signalInfo, isAvailable),
      networkInfo: _.filter(signalInfo, isAvailable),
      network4g: signalInfo[Layers.Dekning4G],
      network3g: signalInfo[Layers.Dekning3G],
      network2g: signalInfo[Layers.Dekning2G],
      outsideOfNorway: signalInfo.outsideOfNorway,
      spmOgSvar: {
        text: "spørsmål og svar om dekning",
        url: "http://www.telenor.no/privat/dekning/sporsmal-og-svar.jsp"
      },
      mobilabb: {
        text: "Mobil M+, L, eller XL",
        url: "http://www.telenor.no/privat/mobil/mobilabonnement/"
      }
    };

    var popupText = dekningPopupTemplate(templateData);

    deleteMarker(MapClickedId);
    var marker = L.marker(L.latLng(latlng.lat, latlng.lng), { icon: icons.PlaceLocation });
    map.addLayer(marker);
    markers[MapClickedId] = marker;

    // show custom mobile popup
    if (isMobile) {
      MobilePopup.show(popupText);
      //map.panTo(marker.getLatLng());
      var numberOfDekning = $(".dekning-module").length;
      if (numberOfDekning)
          setWidthOnDekningModule(numberOfDekning);
    }
    else {
      // show leaflet map popup
      var popup = new L.TelenorPopup({ className: 'dekning-popup' }).setContent(popupText);
      marker.bindPopup(popup, {
        offset: [250, 93] // offset from where click was initiated, position popup to the right
      }).openPopup();
    }
    hasOpenPopup = true;
  });
}

var geocoding = new L.esri.Services.Geocoding(GeocodeUrl, { token: GeocodeToken });

var didAttachAuthListener = false,
    authenticationFailedError;

function reverseLookupAsync(location, options) {

  return new Promise((resolve, reject) => {

    if (!didAttachAuthListener) {
      geocoding.on('authenticationrequired', (err) => {
        authenticationFailedError = err;
        failWithAuthenticationFailed(err);
      });
      didAttachAuthListener = true;
    }

    if (authenticationFailedError) {
      return failWithAuthenticationFailed(authenticationFailedError);
    }

    geocoding.reverse(location, options, function (error, result, response)  {
      var popupText = "";
      if (!error) { // we get errors if the address is not found
          var address = response.address;
          if (address.Adresse) popupText += address.Adresse + ", ";
        popupText += address.Postnummer + " " + address.Poststed;
      }
      resolve({ text: popupText });
    });

    function failWithAuthenticationFailed (error) {
      if (error) {
        console.error('reverse geocoding failed: authentication failed, has the token expired?', error);
        resolve({ error: error });
      }
    }
  });
}

function getLayerName (layerId) {
  switch (layerId) {
    case Layers.Dekning4G: return "4g";
    case Layers.Dekning3G: return "3g";
    case Layers.Dekning2G: return "2g";
    default: return "Ukjent";
  }
}

function filterGeometryPoints (result) {
  return result.geometryType === 'esriGeometryPoint';
}

function hasResponseFromInsideNorway (result) {
  return result.layerId === Layers.InsideNorway;
}
