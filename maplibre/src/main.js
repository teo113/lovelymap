import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MaplibreExportControl, Size, PageOrientation, Format, DPI } from '@watergis/maplibre-gl-export';
import '@watergis/maplibre-gl-export/dist/maplibre-gl-export.css';
import { TerraDraw, TerraDrawMapLibreGLAdapter, TerraDrawPointMode, TerraDrawLineStringMode, TerraDrawPolygonMode } from 'terra-draw';
import proj4 from 'proj4';

// Define British National Grid projection (EPSG:27700)
proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs");

// Basemap configurations
const basemaps = {
    voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: {
        version: 8,
        sources: {
            'esri-satellite': {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                tileSize: 256,
                attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            }
        },
        layers: [{
            id: 'esri-satellite',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 19
        }]
    },
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
    maxPitch: 85,
    dragRotate: false, // Disable rotation
    touchZoomRotate: false,
    maxBounds: [
        [-6, 49.8], // Southwest coordinates
        [-0.8, 52.1]  // Northeast coordinates
    ]
});

// State management
let currentBasemap = 'voyager';
let measureMode = false;
let measurePoints = [];
let terraDraw = null;
let is3DMode = false;
let savedDrawings = []; // Store drawings when switching to measure mode

// Add navigation controls (zoom buttons)
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

// Add custom pan control
class PanControl {
    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        
        const button = document.createElement('button');
        button.className = 'maplibregl-ctrl-icon maplibregl-ctrl-pan';
        button.type = 'button';
        button.title = 'Pan tool (reset)';
        button.setAttribute('aria-label', 'Pan tool');
        
        // Add hand icon
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
        </svg>`;
        
        button.addEventListener('click', () => {
            resetToPanMode();
        });
        
        this._container.appendChild(button);
        return this._container;
    }
    
    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}

map.addControl(new PanControl(), 'top-left');

// Add scale control (both imperial and metric)
const scaleControlImperial = new maplibregl.ScaleControl({
    maxWidth: 80,
    unit: 'imperial'
});
map.addControl(scaleControlImperial, 'bottom-left');

const scaleControlMetric = new maplibregl.ScaleControl({
    maxWidth: 80,
    unit: 'metric'
});
map.addControl(scaleControlMetric, 'bottom-left');

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

// Coordinates display with BNG conversion
const coordinatesDiv = document.getElementById('coordinates');
map.on('mousemove', (e) => {
    const lng = e.lngLat.lng.toFixed(5);
    const lat = e.lngLat.lat.toFixed(5);
    
    // Convert to British National Grid
    const bng = proj4('EPSG:4326', 'EPSG:27700', [e.lngLat.lng, e.lngLat.lat]);
    const bngX = Math.round(bng[0]);
    const bngY = Math.round(bng[1]);
    
    coordinatesDiv.innerHTML = `Lat: ${lat}, Lng: ${lng}<br>BNG: ${bngX.toLocaleString()}E, ${bngY.toLocaleString()}N`;
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

    // Close panels when clicking outside (only certain panels)
    // Tools, Layers, and 3D panels stay open until manually closed
    const autoClosePanels = ['basemap', 'info']; // Only these panels auto-close
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#controls-container')) {
            autoClosePanels.forEach(controlName => {
                document.getElementById(`${controlName}-content`).classList.remove('show');
                document.getElementById(`${controlName}-toggle`).classList.remove('active');
            });
        }
    });
}

// Basemap switching
function setupBasemapSelector() {
    const basemapInputs = document.querySelectorAll('input[name="basemap"]');
    
    // Ensure the correct radio button is checked on load
    basemapInputs.forEach(input => {
        if (input.value === currentBasemap) {
            input.checked = true;
        }
    });
    
    basemapInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const newBasemap = e.target.value;
            if (newBasemap !== currentBasemap) {
                // Save current drawings before style change
                let drawingsSnapshot = [];
                let wasDrawingActive = false;
                let activeToolId = null;
                
                // Get drawings from TerraDraw if active
                if (terraDraw && terraDraw.enabled) {
                    drawingsSnapshot = terraDraw.getSnapshot();
                    wasDrawingActive = true;
                    const activeDrawTool = document.querySelector('.tool-btn.active[id^="draw-"]');
                    activeToolId = activeDrawTool ? activeDrawTool.id : null;
                    terraDraw.stop();
                }
                // Or get saved drawings if in measure mode
                else if (savedDrawings.length > 0) {
                    drawingsSnapshot = [...savedDrawings];
                }
                // Or get drawings from static display
                else if (map.getSource('static-drawings')) {
                    const staticSource = map.getSource('static-drawings');
                    const data = staticSource._data;
                    if (data && data.features) {
                        drawingsSnapshot = [...data.features];
                    }
                }
                
                currentBasemap = newBasemap;
                map.setStyle(basemaps[newBasemap]);
                
                map.once('style.load', () => {
                    // This event fires after the style and all its resources have been loaded.
                    addDummyLayers();
                    addWMSLayer();
                    
                    // Re-initialize TerraDraw
                    initializeTerraDraw();
                    
                    if (drawingsSnapshot.length > 0) {
                        if (wasDrawingActive && activeToolId) {
                            terraDraw.start();
                            terraDraw.addFeatures(drawingsSnapshot);
                            // Restore active mode
                            const mode = activeToolId.split('-')[1]; // e.g., 'point' from 'draw-point'
                            if (['point', 'linestring', 'polygon'].includes(mode)) {
                                terraDraw.setMode(mode);
                            }
                            savedDrawings = [];
                        } else {
                            savedDrawings = drawingsSnapshot;
                            displaySavedDrawings();
                        }
                    }

                    if (is3DMode) {
                        apply3DSettings();
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
    document.getElementById('3d-view').addEventListener('change', (e) => {
        if (e.target.checked) {
            enable3DView();
        } else {
            disable3DView();
        }
    });

    document.getElementById('3d-buildings').addEventListener('change', (e) => {
        if (e.target.checked) {
            // Ensure 3D view is enabled when buildings are turned on
            if (!document.getElementById('3d-view').checked) {
                document.getElementById('3d-view').checked = true;
                enable3DView();
            }
            add3DBuildings();
        } else {
            remove3DBuildings();
        }
    });

    document.getElementById('3d-terrain').addEventListener('change', (e) => {
        if (e.target.checked) {
            // Ensure 3D view is enabled when terrain is turned on
            if (!document.getElementById('3d-view').checked) {
                document.getElementById('3d-view').checked = true;
                enable3DView();
            }
            add3DTerrain();
        } else {
            remove3DTerrain();
        }
    });
}

function apply3DSettings() {
    const view3D = document.getElementById('3d-view').checked;
    const buildings = document.getElementById('3d-buildings').checked;
    const terrain = document.getElementById('3d-terrain').checked;

    if (view3D) enable3DView();
    // Apply terrain first, as it seems to help stabilize the building layer addition
    if (terrain) add3DTerrain();
    if (buildings) add3DBuildings();
}

function enable3DView() {
    is3DMode = true;
    // Enable rotation and pitch controls
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.keyboard.enableRotation();
    
    // Hide scale bars (misleading in 3D)
    hideScaleBars();
    
    // Transition to 3D view
    map.easeTo({ 
        pitch: 60,
        bearing: 0,
        duration: 1000 
    });
}

function disable3DView() {
    is3DMode = false;
    // Disable rotation controls
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    
    // Show scale bars again
    showScaleBars();
    
    // Reset to top-down, north-up view
    map.easeTo({ 
        pitch: 0,
        bearing: 0,
        duration: 1000 
    });
}

function hideScaleBars() {
    const scaleBars = document.querySelectorAll('.maplibregl-ctrl-scale');
    scaleBars.forEach(bar => {
        bar.style.display = 'none';
    });
}

function showScaleBars() {
    const scaleBars = document.querySelectorAll('.maplibregl-ctrl-scale');
    scaleBars.forEach(bar => {
        bar.style.display = 'block';
    });
}

function add3DBuildings() {
    // Check if layer already exists
    if (map.getLayer('3d-buildings')) return;
    
    // Check if we have a composite source with building data
    const style = map.getStyle();
    const hasCompositeSource = style.sources && style.sources.composite;
    
    if (!hasCompositeSource) {
        // For raster basemaps, we need to add OpenStreetMap building data
        if (!map.getSource('openmaptiles')) {
            map.addSource('openmaptiles', {
                type: 'vector',
                url: 'https://api.maptiler.com/tiles/v3/tiles.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
            });
        }
        
        map.addLayer({
            id: '3d-buildings',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                    'case',
                    ['has', 'render_height'], ['get', 'render_height'],
                    5
                ],
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 0.6
            }
        });
    } else {
        // For vector basemaps with composite source
        const layers = style.layers;
        let labelLayerId;
        for (let i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
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
    }
}

function remove3DBuildings() {
    if (map.getLayer('3d-buildings')) {
        map.removeLayer('3d-buildings');
    }
}

function add3DTerrain() {
    // IMPORTANT: Make sure your .env file in the /maplibre directory has VITE_MAPTILER_API_KEY='your_key'
    const mapTilerKey = import.meta.env.VITE_MAPTILER_API_KEY;
    if (!mapTilerKey) {
        console.error("VITE_MAPTILER_API_KEY is not set. Please check your .env file and restart the dev server.");
        return;
    }
    const terrainUrl = `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${mapTilerKey}`;

    const terrainSource = {
        type: 'raster-dem',
        url: terrainUrl,
        tileSize: 256,
        //maxzoom: 14 // Prevent loading high-res tiles for distant terrain
    };

    const hillshadeSource = {
        type: 'raster-dem',
        url: terrainUrl,
        tileSize: 256,
        //maxzoom: 14 // Prevent loading high-res tiles for distant terrain
    };

    const hillshadeLayer = {
        id: 'hills',
        type: 'hillshade',
        source: 'hillshadeSource',
        layout: { visibility: 'visible' },
        paint: { 'hillshade-shadow-color': '#473B24' }
    };
    
    // With MapLibre v2+, we don't need to add a sky layer manually.
    // It's often handled by the style or terrain settings.

    if (!map.getSource('terrainSource')) {
        map.addSource('terrainSource', terrainSource);
    }
    if (!map.getSource('hillshadeSource')) {
        map.addSource('hillshadeSource', hillshadeSource);
    }
    
    if (!map.getLayer('hills')) {
        map.addLayer(hillshadeLayer);
    }

    // Add a sky layer and fog to improve performance and aesthetics
    // map.setSky({
    //     'sky-color': '#cae0f0',          // a light blue sky
    //     'sky-horizon-blend': 0.2,       // blend between sky and horizon
    //     'horizon-color': '#d4e4f0',      // a hazy white-blue horizon
    //     'horizon-fog-blend': 0.8,       // blend between horizon and fog
    //     'fog-color': '#d4e4f0',          // fog color should match horizon
    //     'fog-ground-blend': 0.2         // how much fog blends with the ground
    // });

    map.setTerrain({ source: 'terrainSource', exaggeration: 1.0 });
    console.log('3D Terrain enabled');
}

function remove3DTerrain() {
    map.setTerrain(null);
    map.setSky(undefined); // Remove the sky and fog settings
    if (map.getLayer('hills')) {
        map.removeLayer('hills');
    }
    if (map.getSource('hillshadeSource')) {
        map.removeSource('hillshadeSource');
    }
    // Only remove terrainSource if it's not being used by other layers (it isn't here)
    if (map.getSource('terrainSource')) {
        map.removeSource('terrainSource');
    }
    console.log('3D Terrain disabled');
}

// Drawing tools
function setupDrawingTools() {
    document.getElementById('draw-point').addEventListener('click', () => {
        const btn = document.getElementById('draw-point');
        
        // If already active, deactivate but keep drawings visible
        if (btn.classList.contains('active')) {
            if (terraDraw.enabled) {
                savedDrawings = terraDraw.getSnapshot();
                terraDraw.stop();
                displaySavedDrawings();
            }
            clearActiveDrawTool();
            return;
        }
        
        // Disable and clear measure tool if active
        if (measureMode) {
            measureMode = false;
            document.getElementById('measure-tool').classList.remove('active');
            clearMeasure();
            map.getCanvas().style.cursor = '';
        }
        
        // Remove static drawing display if present
        removeStaticDrawings();
        
        // Start TerraDraw if not already enabled
        if (!terraDraw.enabled) {
            terraDraw.start();
            // Restore any saved drawings
            if (savedDrawings.length > 0) {
                terraDraw.addFeatures(savedDrawings);
                savedDrawings = [];
            }
        }
        // If TerraDraw is already enabled, just switch mode (drawings are preserved)
        terraDraw.setMode('point');
        setActiveDrawTool('draw-point');
    });

    document.getElementById('draw-line').addEventListener('click', () => {
        const btn = document.getElementById('draw-line');
        
        // If already active, deactivate but keep drawings visible
        if (btn.classList.contains('active')) {
            if (terraDraw.enabled) {
                savedDrawings = terraDraw.getSnapshot();
                terraDraw.stop();
                displaySavedDrawings();
            }
            clearActiveDrawTool();
            return;
        }
        
        // Disable and clear measure tool if active
        if (measureMode) {
            measureMode = false;
            document.getElementById('measure-tool').classList.remove('active');
            clearMeasure();
            map.getCanvas().style.cursor = '';
        }
        
        // Remove static drawing display if present
        removeStaticDrawings();
        
        // Start TerraDraw if not already enabled
        if (!terraDraw.enabled) {
            terraDraw.start();
            // Restore any saved drawings
            if (savedDrawings.length > 0) {
                terraDraw.addFeatures(savedDrawings);
                savedDrawings = [];
            }
        }
        // If TerraDraw is already enabled, just switch mode (drawings are preserved)
        terraDraw.setMode('linestring');
        setActiveDrawTool('draw-line');
    });

    document.getElementById('draw-polygon').addEventListener('click', () => {
        const btn = document.getElementById('draw-polygon');
        
        // If already active, deactivate but keep drawings visible
        if (btn.classList.contains('active')) {
            if (terraDraw.enabled) {
                savedDrawings = terraDraw.getSnapshot();
                terraDraw.stop();
                displaySavedDrawings();
            }
            clearActiveDrawTool();
            return;
        }
        
        // Disable and clear measure tool if active
        if (measureMode) {
            measureMode = false;
            document.getElementById('measure-tool').classList.remove('active');
            clearMeasure();
            map.getCanvas().style.cursor = '';
        }
        
        // Remove static drawing display if present
        removeStaticDrawings();
        
        // Start TerraDraw if not already enabled
        if (!terraDraw.enabled) {
            terraDraw.start();
            // Restore any saved drawings
            if (savedDrawings.length > 0) {
                terraDraw.addFeatures(savedDrawings);
                savedDrawings = [];
            }
        }
        // If TerraDraw is already enabled, just switch mode (drawings are preserved)
        terraDraw.setMode('polygon');
        setActiveDrawTool('draw-polygon');
    });

    document.getElementById('clear-draw').addEventListener('click', () => {
        if (terraDraw.enabled) {
            terraDraw.clear();
            terraDraw.stop();
        }
        savedDrawings = []; // Clear saved drawings too
        removeStaticDrawings(); // Remove static display if present
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

// Display saved drawings as static GeoJSON layers
function displaySavedDrawings() {
    if (savedDrawings.length === 0) return;
    
    // Remove existing static layer if present
    if (map.getLayer('static-drawings')) {
        map.removeLayer('static-drawings-fill');
        map.removeLayer('static-drawings-line');
        map.removeLayer('static-drawings-point');
    }
    if (map.getSource('static-drawings')) {
        map.removeSource('static-drawings');
    }
    
    // Create GeoJSON from saved drawings
    const geojson = {
        type: 'FeatureCollection',
        features: savedDrawings
    };
    
    map.addSource('static-drawings', {
        type: 'geojson',
        data: geojson
    });
    
    // Add layers for different geometry types
    map.addLayer({
        id: 'static-drawings-fill',
        type: 'fill',
        source: 'static-drawings',
        filter: ['==', '$type', 'Polygon'],
        paint: {
            'fill-color': '#3887be',
            'fill-opacity': 0.4
        }
    });
    
    map.addLayer({
        id: 'static-drawings-line',
        type: 'line',
        source: 'static-drawings',
        filter: ['==', '$type', 'LineString'],
        paint: {
            'line-color': '#3887be',
            'line-width': 3
        }
    });
    
    map.addLayer({
        id: 'static-drawings-point',
        type: 'circle',
        source: 'static-drawings',
        filter: ['==', '$type', 'Point'],
        paint: {
            'circle-radius': 6,
            'circle-color': '#3887be'
        }
    });
}

// Remove static drawing display
function removeStaticDrawings() {
    if (map.getLayer('static-drawings-fill')) {
        map.removeLayer('static-drawings-fill');
    }
    if (map.getLayer('static-drawings-line')) {
        map.removeLayer('static-drawings-line');
    }
    if (map.getLayer('static-drawings-point')) {
        map.removeLayer('static-drawings-point');
    }
    if (map.getSource('static-drawings')) {
        map.removeSource('static-drawings');
    }
}

// Measure tool
function setupMeasureTool() {
    const measureBtn = document.getElementById('measure-tool');
    
    measureBtn.addEventListener('click', () => {
        measureMode = !measureMode;
        measureBtn.classList.toggle('active');
        
        if (measureMode) {
            // Save current drawings and convert to static display
            if (terraDraw && terraDraw.enabled) {
                savedDrawings = terraDraw.getSnapshot();
                terraDraw.stop();
                // Display drawings as static GeoJSON layer
                displaySavedDrawings();
            }
            clearActiveDrawTool();
            
            map.getCanvas().style.cursor = 'crosshair';
            measurePoints = [];
        } else {
            map.getCanvas().style.cursor = '';
            clearMeasure();
            // Keep static display until user activates a draw tool
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

// Reset to pan mode - deactivate all tools
function resetToPanMode() {
    // Deactivate measure tool
    if (measureMode) {
        measureMode = false;
        document.getElementById('measure-tool').classList.remove('active');
        clearMeasure();
    }
    
    // Deactivate drawing tools but keep drawings visible as static
    if (terraDraw && terraDraw.enabled) {
        savedDrawings = terraDraw.getSnapshot();
        terraDraw.stop();
        displaySavedDrawings();
    }
    clearActiveDrawTool();
    
    // Reset cursor to default
    map.getCanvas().style.cursor = '';
}

// Export functionality
function setupExport() {
    document.getElementById('export-map').addEventListener('click', () => {
        // Placeholder for future GeoJSON export functionality
        console.log('Export functionality - placeholder for future GeoJSON export');
        console.log('Future: Export drawings to GeoJSON format');
        
        // Could add TerraDraw snapshot export here in the future:
        // const snapshot = terraDraw.getSnapshot();
        // console.log('Drawings:', snapshot);
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
