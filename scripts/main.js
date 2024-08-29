// main.js
// Function to transform the request URL
var transformRequest = (url, resourceType) => {
  var isMapboxRequest =
    url.slice(8, 22) === "api.mapbox.com" ||
    url.slice(10, 26) === "tiles.mapbox.com";
  return {
    url: isMapboxRequest
      ? url.replace("?", "?pluginName=sheetMapper&")
      : url
  };
};

// Initialize Mapbox GL JS
mapboxgl.accessToken = 'pk.eyJ1Ijoib29oYWxha2thZGkiLCJhIjoiY2x4OWZ4Mmt2MTV3YjJycHZkMmlzcWI2NSJ9.oMo7f3apUlEXGgcnTWkTPg';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/oohalakkadi/clxwvv3g6004401om6yr48l3d',
  center: [35.222470, 31.938833],
  zoom: 8.04,
  transformRequest: transformRequest
});

map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');
map.addControl(
  new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl
  })
);

var basemaps = {
  light: 'mapbox://styles/oohalakkadi/clxwvv3g6004401om6yr48l3d',
  dark: 'mapbox://styles/oohalakkadi/clxx2ggsp004f01rh1ked0p5e',
  satellite: 'mapbox://styles/oohalakkadi/clxx2ho7n00yu01po22a4211w'
};

var currentZoom = map.getZoom();  // Store initial zoom level

document.getElementById('basemap-menu').addEventListener('click', function (e) {
  if (e.target.tagName === 'A') {
    var activeLinks = document.querySelectorAll('#basemap-menu a.active');
    activeLinks.forEach(function (link) {
      link.classList.remove('active');
    });

    var styleId = e.target.id;
    var currentCenter = map.getCenter();  // Get current center

    map.setStyle(basemaps[styleId]);

    map.on('style.load', function () {    // After style is loaded
      map.setCenter(currentCenter);       // Set center back
      map.setZoom(currentZoom);           // Set zoom back
    });

    currentZoom = map.getZoom();
    e.target.classList.add('active');
  }
});

