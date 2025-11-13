this maplibre-gl web map is a concept project to see if I can build a web map using Cursor alone.

## client requirements
* node.js (using volta)
* vite (with config file)
* maplibre-gl
* modular, not commonjs

## map requirements
* full screen
* default basemap: https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json
* 2D map with rotation disabled
* 3D toggle (using current location from 2D map. see below for details)
* scale bar in corner (imperial and metric)
* basemap selector (include a couple of free to use basemaps)
* layer selector with layer groups (include some dummy layers)
* wms layer with transparency slider if possible
* distance measure tool
* info button which reveals basic infomation about the map, author etc
* discreet lat long cursor box (https://maplibre.org/maplibre-gl-js/docs/examples/get-coordinates-of-the-mouse-pointer/)
* simple geometry drawer (https://maplibre.org/maplibre-gl-js/docs/examples/draw-geometries-with-terra-draw/)
* simple map export to pdf or png (https://github.com/watergis/maplibre-gl-export)

### 3D toggle should have toggles for these layers:
* 3D buildings layer (use this dataset for reference: https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/)
* 3D terrain (https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/)
* globe view enabled