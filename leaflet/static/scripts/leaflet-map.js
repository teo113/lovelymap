////////////////////////////// PROJECTION SETTINGS
var crs = new L.Proj.CRS('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs', {
    resolutions: [ 896.0, 448.0, 224.0, 112.0, 56.0, 28.0, 14.0, 7.0, 3.5, 1.75 ],
    origin: [ -238375.0, 1376256.0 ]
});

////////////////////////////// COORDINATE TRANSFORM FUNCTION
var transformCoords = function(arr) {
    return proj4('EPSG:27700', 'EPSG:4326', arr).reverse();
};

////////////////////////////// MAP LAYERS
os_key = 'N3vMFK52P63Ao1dAp4cRq31OHpnXz5rW'

var os_outdoor = L.tileLayer('https://api.os.uk/maps/raster/v1/zxy/Outdoor_27700/{z}/{x}/{y}.png?key=' + os_key)//.addTo(map);
var os_light = L.tileLayer('https://api.os.uk/maps/raster/v1/zxy/Light_27700/{z}/{x}/{y}.png?key=' + os_key)//.addTo(map);

var arcgis_topo = L.esri.tiledMapLayer({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
    maxZoom: 19,
    minZoom: 6
    });//.addTo(map);

////////////////////////////// MAP SETTINGS
var map_options = {
    layers: [os_outdoor],
    crs: crs,
    minZoom: 0,
    maxZoom: 9,
    center: transformCoords([ 337297, 503695 ]),
    zoom: 7,
    maxBounds: [
        transformCoords([ -238375.0, 0.0 ]),
        transformCoords([ 900000.0, 1376256.0 ])
    ],
    attributionControl: false
};

////////////////////////////// MAP OBJECT
//var map = L.map('leaflet-map', {crs: crs, attributionControl: false}).setView([51.505, -0.09], 7);
var map = L.map('leaflet-map', map_options);

////////////////////////////// MAP CONTROLS
var basemaps = {
    'Light': os_light,
    'Outdoor': os_outdoor
};

var overlaymaps = {};

L.control.layers(basemaps, overlaymaps).addTo(map);
