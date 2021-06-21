////////////////////////////// PROJECTION SETTINGS
// define BNG projection
var crs = new L.Proj.CRS('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs', {
    resolutions: [ 896.0, 448.0, 224.0, 112.0, 56.0, 28.0, 14.0, 7.0, 3.5, 1.75 ],
    origin: [ -238375.0, 1376256.0 ]
});

////////////////////////////// COORDINATE TRANSFORM FUNCTION
// function to be used throughout script
var transformCoords = function(arr) {
    return proj4('EPSG:27700', 'EPSG:4326', arr).reverse();
};

////////////////////////////// MAP LAYERS
// osm DOESN'T WORK AS NO NATIVE 27700 TILES...?
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})//.addTo(map);

// os
os_key = 'N3vMFK52P63Ao1dAp4cRq31OHpnXz5rW'
os_att = '&copy; Crown copyright and database rights 2021 OS [100059651]'

var os_road = L.tileLayer('https://api.os.uk/maps/raster/v1/zxy/Road_27700/{z}/{x}/{y}.png?key=' + os_key, {attribution: os_att})//.addTo(map);
var os_outdoor = L.tileLayer('https://api.os.uk/maps/raster/v1/zxy/Outdoor_27700/{z}/{x}/{y}.png?key=' + os_key, {attribution: os_att})//.addTo(map);
var os_light = L.tileLayer('https://api.os.uk/maps/raster/v1/zxy/Light_27700/{z}/{x}/{y}.png?key=' + os_key, {attribution: os_att})//.addTo(map);

// esri
var esri_wi = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png', {attributions: 'Esri'});

var arcgis_world = L.esri.tiledMapLayer({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    minZoom: 6,
    maxZoom: 19
    });//.addTo(map);

var arcgis_topo = L.esri.tiledMapLayer({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
    minZoom: 6,
    maxZoom: 19
    });//.addTo(map);

var os_open = L.esri.tiledMapLayer({
    url: 'https://tiles.arcgis.com/tiles/qHLhLQrcvEnxjtPr/arcgis/rest/services/OS_Open_Background_2/MapServer',
    maxZoom: 19,
    minZoom: 6
  });//.addTo(map);

// astun
var astun_open = L.tileLayer.wms('http://t0.ads.astuntechnology.com/open/osopen/service', {
    layers: 'osopen',
    format: 'image/png',
    maxZoom: 14,
    minZoom: 0,
    continuousWorld: true,
    attribution: 'Astun Data Service &copy; Ordnance Survey.'
})

////////////////////////////// MAP OBJECT
// map settings
var map_options = {
    layers: [os_outdoor],
    crs: crs,
    minZoom: 0,
    maxZoom: 9,
    center: transformCoords([ 321260, 232453 ]),
    zoom: 6,
    maxBounds: [
        transformCoords([ -238375.0, 0.0 ]),
        transformCoords([ 900000.0, 1376256.0 ])
    ],
    attributionControl: true
};

// the map
var map = L.map('leaflet-map', map_options);

////////////////////////////// MAP CONTROLS
// basemap group
var basemaps = {
    'OSM': osm,
    'Astun Open': astun_open,
    'Esri': os_open,
    'Light': os_light,
    'Outdoor': os_outdoor,
    'Road': os_road
};

var overlaymaps = {};

// add everything to the map
L.control.layers(basemaps, overlaymaps).addTo(map);
L.control.mousePosition().addTo(map);
L.Control.geocoder().addTo(map);
