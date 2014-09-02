var EventEmitter = require('events').EventEmitter;

var eventBus = new EventEmitter();
module.exports = eventBus;
module.exports.toggleLayer = id => {
  eventBus.emit('toggleLayer', id);
};

window.require(["esri/map", "esri/layers/ArcGISDynamicMapServiceLayer", "esri/dijit/BasemapToggle", "dojo/domReady!"], (Map, ArcGISDynamicMapServiceLayer, BasemapToggle) => {
  var map = new Map("mapDiv", {
    center: [10, 63],
    zoom: 5,
    basemap: "streets"
  });

  map.on("load", () => {
    eventBus.emit("map:load");
  });

  var DekningToken = "sg0Aq_ztEufQ6N-nw_NLkyRYRoQArMLOcLFPT77jzeKrqCbVdow5BAnbh6x-7lHs";
  var DekningUrl = "http://153.110.250.77/arcgis/rest/services/covragemap/coveragemap2/MapServer?token=" + DekningToken;

  var dekningsLayer = new ArcGISDynamicMapServiceLayer(DekningUrl, {
    opacity: 0.5
  });
  var layers = [3,7,9];

  dekningsLayer.setVisibleLayers(layers);
  map.addLayer(dekningsLayer);

  eventBus.on('toggleLayer', id => {
    var index = layers.indexOf(id);
    if(index < 0){
      layers.push(id);
    } else {
      layers.splice(index, 1);
    }
    dekningsLayer.setVisibleLayers(layers);
  });

  var toggle = new BasemapToggle({
    map: map,
    basemap: "satellite"
  }, "basemapToggle");
  toggle.startup();
});
