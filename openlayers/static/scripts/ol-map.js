////////////////////////////// MAP SETTINGS
proj4.defs("EPSG:27700","+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.060,0.1502,0.2470,0.8421,-20.4894 +datum=OSGB36 +units=m +no_defs");
ol.proj.proj4.register(proj4);
var mapproj = ol.proj.get('EPSG:27700');
var mapextent = [-238375, 0, 908505, 1376256];
var mapcenter = [356816, 172539]

////////////////////////////// MAP OBJECT
var map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      })
    ],
    view: new ol.View({
      projection: mapproj,
      center: mapcenter,
      extent: mapextent,
      zoom: 5,
      minZoom: 4,
      maxZoom: 18
    })
  });