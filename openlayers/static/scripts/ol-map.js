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
var mapcenter = [310000, 511000]
var mapextent = [-238375, 0, 908505, 1376256];

var tilegrid = new ol.tilegrid.TileGrid({
  resolutions: [ 896.0, 448.0, 224.0, 112.0, 56.0, 28.0, 14.0, 7.0, 3.5, 1.75 ],
  origin: [ -238375.0, 1376256.0 ]
});

////////////////////////////// MAP LAYERS
os_service = 'https://api.os.uk/maps/raster/v1/zxy'
os_key = 'N3vMFK52P63Ao1dAp4cRq31OHpnXz5rW'
os_att = '&copy; Crown copyright and database rights 2021 OS [100059651]'

var basemaps = new ol.layer.Group({
  'title': 'Basemaps',
  layers: [
      new ol.layer.Tile({
          title: 'OSM',
          type: 'base',
          source: new ol.source.OSM()
     }),
      new ol.layer.Tile({
          title: 'Road',
          type: 'base',
          visible: false,
          source: new ol.source.XYZ({
              url: os_service + '/Road_27700/{z}/{x}/{y}.png?key=' + os_key,
              projection: 'EPSG:27700',
              tileGrid: tilegrid,
              attributions: os_att
          })
      }),
      new ol.layer.Tile({
          title: 'Outdoor',
          type: 'base',
          visible: false,
          source: new ol.source.XYZ({
              url: os_service + '/Outdoor_27700/{z}/{x}/{y}.png?key=' + os_key,
              projection: 'EPSG:27700',
              tileGrid: tilegrid,
              attributions: os_att
          })
      }),
      new ol.layer.Tile({
          title: 'Light',
          type: 'base',
          visible: false,
          source: new ol.source.XYZ({
              url: os_service + '/Light_27700/{z}/{x}/{y}.png?key=' + os_key,
              projection: 'EPSG:27700',
              tileGrid: tilegrid,
              attributions: os_att
          })
      })
  ]
});

////////////////////////////// MAP CONTROLS

// popup
var popup = new ol.Overlay.Popup();
//map.addOverlay(popup);

// mouse coordinates
var mousePositionCtrl = new ol.control.MousePosition({
  coordinateFormat: ol.coordinate.createStringXY(2),
  projection: proj27700,
  target: document.getElementById('locationText'),
  undefinedHTML: '&nbsp;'
});

// layer switcher
var layerSwitcher = new ol.control.LayerSwitcher();

// address search
var geocoder = new Geocoder('nominatim', {
  provider: 'osm',
  lang: 'en', //en-US, fr-FR
  placeholder: 'Search for ...',
  //targetType: 'text-input',
  limit: 5,
  keepOpen: true
});

//Listen when an address is chosen
geocoder.on('addresschosen', function (evt) {
	console.info(evt);
  window.setTimeout(function () {
    popup.show(evt.coordinate, evt.address.formatted);
  }, 3000);
});

////////////////////////////// MAP OBJECT
var view = new ol.View({
    projection: proj27700,
    center: mapcenter,
    extent: mapextent,
    zoom: 8,
    minZoom: 6,
    maxZoom: 19
});

var map = new ol.Map({
    target: 'ol-map',
    layers: [
      basemaps
    ],
    controls: ol.control.defaults().extend([mousePositionCtrl, layerSwitcher, geocoder, popup]),
    view: view
    });