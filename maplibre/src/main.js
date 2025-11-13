import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MaplibreExportControl, Size, PageOrientation, Format, DPI } from '@watergis/maplibre-gl-export';
import '@watergis/maplibre-gl-export/dist/maplibre-gl-export.css';
import { TerraDraw, TerraDrawMapLibreGLAdapter, TerraDrawPointMode, TerraDrawLineStringMode, TerraDrawPolygonMode } from 'terra-draw';

// Basemap configurations
const basemaps = {
    voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    osm: {
        version: 8,
        sources: {
            osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
            }
        },
        layers: [{
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
        }]
    }
};

// Initialize map
const map = new maplibregl.Map({
    container: 'map',
    style: basemaps.voyager,
    center: [-2.5, 51.5],
    zoom: 12,
    pitch: 0,
    bearing: 0,
    dragRotate: false, // Disable rotation
    touchZoomRotate: false
});

// State management
let currentBasemap = 'voyager';
let measureMode = false;
let measurePoints = [];
let terraDraw = null;
let is3DMode = false;

// Add navigation controls (zoom buttons)
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

// Add scale control (both imperial and metric)
map.addControl(new maplibregl.ScaleControl({
    maxWidth: 80,
    unit: 'imperial'
}), 'bottom-left');

map.addControl(new maplibregl.ScaleControl({
    maxWidth: 80,
    unit: 'metric'
}), 'bottom-left');

// Add export control (hidden via CSS but available programmatically)
const exportControl = new MaplibreExportControl({
    PageSize: Size.A4,
    PageOrientation: PageOrientation.Portrait,
    Format: Format.PNG,
    DPI: DPI[300],
    Crosshair: true,
    PrintableArea: true,
    Local: 'en'
});
map.addControl(exportControl, 'top-left');

// Coordinates display
const coordinatesDiv = document.getElementById('coordinates');
map.on('mousemove', (e) => {
    const lng = e.lngLat.lng.toFixed(5);
    const lat = e.lngLat.lat.toFixed(5);
    coordinatesDiv.textContent = `Lng: ${lng}, Lat: ${lat}`;
});

// Map load event
map.on('load', () => {
    // Add dummy data sources
    addDummyLayers();
    
    // Add WMS layer (example weather overlay)
    addWMSLayer();
    
    // Initialize TerraDraw
    initializeTerraDraw();
});

// Add dummy layers for demonstration
function addDummyLayers() {
    // Points of Interest
    map.addSource('poi-source', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] },
                    properties: { name: 'London Eye' }
                },
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [-0.1406, 51.5007] },
                    properties: { name: 'Westminster' }
                }
            ]
        }
    });

    map.addLayer({
        id: 'poi-layer',
        type: 'circle',
        source: 'poi-source',
        layout: { visibility: 'none' },
        paint: {
            'circle-radius': 8,
            'circle-color': '#FF5722',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
        }
    });

    // Transportation lines
    map.addSource('transport-source', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[-0.1276, 51.5074], [-0.1406, 51.5007], [-0.1300, 51.4950]]
                    },
                    properties: { name: 'Route 1' }
                }
            ]
        }
    });

    map.addLayer({
        id: 'transport-layer',
        type: 'line',
        source: 'transport-source',
        layout: { visibility: 'none' },
        paint: {
            'line-color': '#2196F3',
            'line-width': 3
        }
    });

    // Land use polygons
    map.addSource('landuse-source', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [-0.1400, 51.5100],
                            [-0.1200, 51.5100],
                            [-0.1200, 51.5000],
                            [-0.1400, 51.5000],
                            [-0.1400, 51.5100]
                        ]]
                    },
                    properties: { name: 'Park Area' }
                }
            ]
        }
    });

    map.addLayer({
        id: 'landuse-layer',
        type: 'fill',
        source: 'landuse-source',
        layout: { visibility: 'none' },
        paint: {
            'fill-color': '#4CAF50',
            'fill-opacity': 0.4
        }
    });
}

// Add WMS layer
function addWMSLayer() {
    map.addSource('wms-source', {
        type: 'raster',
        tiles: [
            'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=nexrad-n0r-900913'
        ],
        tileSize: 256
    });

    map.addLayer({
        id: 'wms-layer',
        type: 'raster',
        source: 'wms-source',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.7 }
    });
}

// Initialize TerraDraw for geometry drawing
function initializeTerraDraw() {
    terraDraw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
            new TerraDrawPointMode(),
            new TerraDrawLineStringMode(),
            new TerraDrawPolygonMode()
        ]
    });
}

// UI Control toggles
function setupControlToggles() {
    const controls = ['basemap', 'layers', '3d', 'tools', 'info'];
    
    controls.forEach(controlName => {
        const btn = document.getElementById(`${controlName}-toggle`);
        const content = document.getElementById(`${controlName}-content`);
        
        btn.addEventListener('click', () => {
            // Close other panels
            controls.forEach(other => {
                if (other !== controlName) {
                    document.getElementById(`${other}-content`).classList.remove('show');
                    document.getElementById(`${other}-toggle`).classList.remove('active');
                }
            });
            
            // Toggle current panel
            content.classList.toggle('show');
            btn.classList.toggle('active');
        });
    });

    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#controls-container')) {
            controls.forEach(controlName => {
                document.getElementById(`${controlName}-content`).classList.remove('show');
                document.getElementById(`${controlName}-toggle`).classList.remove('active');
            });
        }
    });
}

// Basemap switching
function setupBasemapSelector() {
    const basemapInputs = document.querySelectorAll('input[name="basemap"]');
    
    basemapInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const newBasemap = e.target.value;
            if (newBasemap !== currentBasemap) {
                currentBasemap = newBasemap;
                map.setStyle(basemaps[newBasemap]);
                
                // Re-add custom layers after style change
                map.once('styledata', () => {
                    addDummyLayers();
                    addWMSLayer();
                    if (is3DMode) {
                        // Re-apply 3D settings if they were active
                        setTimeout(() => {
                            apply3DSettings();
                        }, 500);
                    }
                });
            }
        });
    });
}

// Layer visibility toggles
function setupLayerToggles() {
    document.getElementById('layer-points').addEventListener('change', (e) => {
        map.setLayoutProperty('poi-layer', 'visibility', e.target.checked ? 'visible' : 'none');
    });

    document.getElementById('layer-lines').addEventListener('change', (e) => {
        map.setLayoutProperty('transport-layer', 'visibility', e.target.checked ? 'visible' : 'none');
    });

    document.getElementById('layer-polygons').addEventListener('change', (e) => {
        map.setLayoutProperty('landuse-layer', 'visibility', e.target.checked ? 'visible' : 'none');
    });

    // WMS layer with opacity control
    const wmsCheckbox = document.getElementById('layer-wms');
    const wmsControls = document.getElementById('wms-controls');
    const wmsOpacity = document.getElementById('wms-opacity');
    const wmsOpacityValue = document.getElementById('wms-opacity-value');

    wmsCheckbox.addEventListener('change', (e) => {
        map.setLayoutProperty('wms-layer', 'visibility', e.target.checked ? 'visible' : 'none');
        wmsControls.style.display = e.target.checked ? 'block' : 'none';
    });

    wmsOpacity.addEventListener('input', (e) => {
        const opacity = e.target.value / 100;
        wmsOpacityValue.textContent = `${e.target.value}%`;
        map.setPaintProperty('wms-layer', 'raster-opacity', opacity);
    });
}

// 3D controls
function setupThreeDControls() {
    document.getElementById('3d-buildings').addEventListener('change', (e) => {
        if (e.target.checked) {
            add3DBuildings();
        } else {
            remove3DBuildings();
        }
    });

    document.getElementById('3d-terrain').addEventListener('change', (e) => {
        if (e.target.checked) {
            add3DTerrain();
        } else {
            remove3DTerrain();
        }
    });

    document.getElementById('globe-view').addEventListener('change', (e) => {
        if (e.target.checked) {
            enableGlobeView();
        } else {
            disableGlobeView();
        }
    });
}

function apply3DSettings() {
    const buildings = document.getElementById('3d-buildings').checked;
    const terrain = document.getElementById('3d-terrain').checked;
    const globe = document.getElementById('globe-view').checked;

    if (buildings) add3DBuildings();
    if (terrain) add3DTerrain();
    if (globe) enableGlobeView();
}

function add3DBuildings() {
    is3DMode = true;
    
    // Check if layer already exists
    if (map.getLayer('3d-buildings')) return;
    
    // Add 3D buildings layer
    const layers = map.getStyle().layers;
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15, 0,
                15.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15, 0,
                15.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
        }
    }, labelLayerId);

    // Adjust pitch for 3D view
    map.easeTo({ pitch: 60, duration: 1000 });
}

function remove3DBuildings() {
    if (map.getLayer('3d-buildings')) {
        map.removeLayer('3d-buildings');
    }
    
    // Check if any other 3D features are active
    const terrain = document.getElementById('3d-terrain').checked;
    const globe = document.getElementById('globe-view').checked;
    
    if (!terrain && !globe) {
        is3DMode = false;
        map.easeTo({ pitch: 0, duration: 1000 });
    }
}

function add3DTerrain() {
    is3DMode = true;
    
    map.addSource('terrainSource', {
        type: 'raster-dem',
        url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
        tileSize: 256
    });

    map.setTerrain({ source: 'terrainSource', exaggeration: 1.5 });
    map.easeTo({ pitch: 60, duration: 1000 });
}

function remove3DTerrain() {
    map.setTerrain(null);
    if (map.getSource('terrainSource')) {
        map.removeSource('terrainSource');
    }
    
    // Check if any other 3D features are active
    const buildings = document.getElementById('3d-buildings').checked;
    const globe = document.getElementById('globe-view').checked;
    
    if (!buildings && !globe) {
        is3DMode = false;
        map.easeTo({ pitch: 0, duration: 1000 });
    }
}

function enableGlobeView() {
    is3DMode = true;
    map.setProjection({ type: 'globe' });
    map.easeTo({ zoom: 2, center: [0, 30], duration: 2000 });
}

function disableGlobeView() {
    map.setProjection({ type: 'mercator' });
    
    // Check if any other 3D features are active
    const buildings = document.getElementById('3d-buildings').checked;
    const terrain = document.getElementById('3d-terrain').checked;
    
    if (!buildings && !terrain) {
        is3DMode = false;
    }
}

// Drawing tools
function setupDrawingTools() {
    document.getElementById('draw-point').addEventListener('click', () => {
        if (!terraDraw.enabled) {
            terraDraw.start();
        }
        terraDraw.setMode('point');
        setActiveDrawTool('draw-point');
    });

    document.getElementById('draw-line').addEventListener('click', () => {
        if (!terraDraw.enabled) {
            terraDraw.start();
        }
        terraDraw.setMode('linestring');
        setActiveDrawTool('draw-line');
    });

    document.getElementById('draw-polygon').addEventListener('click', () => {
        if (!terraDraw.enabled) {
            terraDraw.start();
        }
        terraDraw.setMode('polygon');
        setActiveDrawTool('draw-polygon');
    });

    document.getElementById('clear-draw').addEventListener('click', () => {
        if (terraDraw.enabled) {
            terraDraw.clear();
            terraDraw.stop();
        }
        clearActiveDrawTool();
    });
}

function setActiveDrawTool(toolId) {
    ['draw-point', 'draw-line', 'draw-polygon'].forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById(toolId).classList.add('active');
}

function clearActiveDrawTool() {
    ['draw-point', 'draw-line', 'draw-polygon'].forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
}

// Measure tool
function setupMeasureTool() {
    const measureBtn = document.getElementById('measure-tool');
    
    measureBtn.addEventListener('click', () => {
        measureMode = !measureMode;
        measureBtn.classList.toggle('active');
        
        if (measureMode) {
            map.getCanvas().style.cursor = 'crosshair';
            measurePoints = [];
        } else {
            map.getCanvas().style.cursor = '';
            clearMeasure();
        }
    });

    map.on('click', (e) => {
        if (!measureMode) return;

        measurePoints.push([e.lngLat.lng, e.lngLat.lat]);

        if (measurePoints.length === 1) {
            // Add first point
            addMeasurePoint(e.lngLat);
        } else if (measurePoints.length > 1) {
            // Update line and add new point
            updateMeasureLine();
            addMeasurePoint(e.lngLat);
        }
    });
}

function addMeasurePoint(lngLat) {
    const el = document.createElement('div');
    el.className = 'measure-point';
    el.style.width = '10px';
    el.style.height = '10px';
    el.style.backgroundColor = '#FF5722';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';

    new maplibregl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);
}

function updateMeasureLine() {
    if (!map.getSource('measure-line')) {
        map.addSource('measure-line', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: measurePoints
                }
            }
        });

        map.addLayer({
            id: 'measure-line',
            type: 'line',
            source: 'measure-line',
            paint: {
                'line-color': '#FF5722',
                'line-width': 3,
                'line-dasharray': [2, 2]
            }
        });
    } else {
        map.getSource('measure-line').setData({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: measurePoints
            }
        });
    }

    // Calculate and display distance
    const distance = calculateDistance(measurePoints);
    showMeasureLabel(distance);
}

function calculateDistance(points) {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        totalDistance += getDistanceBetween(points[i], points[i + 1]);
    }
    return totalDistance;
}

function getDistanceBetween(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(coord2[1] - coord1[1]);
    const dLon = toRad(coord2[0] - coord1[0]);
    const lat1 = toRad(coord1[1]);
    const lat2 = toRad(coord2[1]);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

function showMeasureLabel(distance) {
    const lastPoint = measurePoints[measurePoints.length - 1];
    const distanceText = distance >= 1 
        ? `${distance.toFixed(2)} km` 
        : `${(distance * 1000).toFixed(0)} m`;

    // Remove previous label
    const existingLabel = document.querySelector('.measure-label');
    if (existingLabel) {
        existingLabel.remove();
    }

    // Add new label
    const el = document.createElement('div');
    el.className = 'measure-label';
    el.textContent = distanceText;
    el.style.background = 'rgba(0, 0, 0, 0.8)';
    el.style.color = 'white';
    el.style.padding = '6px 10px';
    el.style.borderRadius = '4px';
    el.style.fontSize = '12px';
    el.style.fontWeight = 'bold';

    new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(lastPoint)
        .addTo(map);
}

function clearMeasure() {
    measurePoints = [];
    
    if (map.getLayer('measure-line')) {
        map.removeLayer('measure-line');
    }
    if (map.getSource('measure-line')) {
        map.removeSource('measure-line');
    }

    // Remove all markers
    document.querySelectorAll('.measure-point').forEach(el => el.remove());
    document.querySelectorAll('.measure-label').forEach(el => el.remove());
}

// Export functionality
function setupExport() {
    document.getElementById('export-map').addEventListener('click', () => {
        // Trigger the export control
        const exportButton = document.querySelector('.maplibregl-ctrl-export button');
        if (exportButton) {
            exportButton.click();
        }
    });
}

// Initialize all UI controls
setupControlToggles();
setupBasemapSelector();
setupLayerToggles();
setupThreeDControls();
setupDrawingTools();
setupMeasureTool();
setupExport();

console.log('LovelyMap initialized successfully!');
