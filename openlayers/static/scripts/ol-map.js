////////////////////////////// MAP SETTINGS
proj4.defs(
  'EPSG:27700',
  '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 ' +
    '+x_0=400000 +y_0=-100000 +ellps=airy ' +
    '+towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 ' +
    '+units=m +no_defs'
);
ol.proj.proj4.register(proj4);
var proj27700 = ol.proj.get('EPSG:27700');
var mapcenter = [310000, 411000]
var mapextent = [-238375, 0, 908505, 1376256];

////////////////////////////// MAP CONTROLS
var mousePositionCtrl = new ol.control.MousePosition({
  coordinateFormat: ol.coordinate.createStringXY(2),
  projection: proj27700,
  target: document.getElementById('locationText'),
  undefinedHTML: '&nbsp;'
});

////////////////////////////// MAP OBJECT
var view = new ol.View({
    projection: proj27700,
    center: mapcenter,
    extent: mapextent,
    zoom: 6,
    minZoom: 6,
    maxZoom: 10
});

var map = new ol.Map({
    target: 'ol-map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      })
    ],
    controls: ol.control.defaults().extend([mousePositionCtrl]),
    view: view
    });