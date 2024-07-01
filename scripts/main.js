// script.js
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
  
  const symbolLayers = ['articles', 'photos', 'social-media', 'goods'];
  const filters = {
    'articles': ['==', 'Format', 'Articles'],
    'photos': ['==', 'Format', 'Photos'],
    'social-media': ['==', 'Format', 'Social Media'],
    'goods': ['==', 'Format', 'Goods & Services']
  };
  
  const svgIcons = {
    'written-works': 'data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8 16h8v2H8v-2zm0-4h8v2H8v-2zm0-4h8v2H8V8z"/></svg>',
    'photography': 'data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>',
    'social-media': 'data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.46 6c-.77.35-1.59.59-2.46.69A4.37 4.37 0 0021.84 4c-.86.51-1.82.88-2.84 1.08A4.36 4.36 0 0015.5 4a4.37 4.37 0 00-4.36 4.37c0 .34.04.67.1.99A12.41 12.41 0 013 5.56a4.37 4.37 0 00-.59 2.2c0 1.53.78 2.87 1.96 3.66-.72-.02-1.4-.22-1.98-.54v.06a4.37 4.37 0 003.5 4.28c-.34.1-.69.15-1.05.15-.26 0-.51-.03-.76-.07a4.37 4.37 0 004.08 3.04A8.74 8.74 0 012 19.54a12.34 12.34 0 006.69 1.96c8.02 0 12.42-6.64 12.42-12.41 0-.19 0-.37-.01-.56.84-.61 1.56-1.37 2.13-2.24z"/></svg>',
    'vendors': 'data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 17.5V20h4v-2.5h5V11h2l-9-9-9 9h2v6.5h5zm-6.5 4V23h17v-1.5h-17z"/></svg>'
  };

  let originalData; // Variable to store original GeoJSON data
  
  $(document).ready(function () {
    $.ajax({
      type: "GET",
      url: 'https://docs.google.com/spreadsheets/d/19FiVC6W4ncKi86eWhYK5Udh6p0ud-aaXuyJW8gpngc0/gviz/tq?tqx=out:csv&sheet=Sheet1',
      dataType: "text",
      success: function (csvData) {
        makeGeoJSON(csvData);
      }
    });
  
    function makeGeoJSON(csvData) {
      csv2geojson.csv2geojson(csvData, {
        latfield: 'Latitude',
        lonfield: 'Longitude',
        delimiter: ','
      }, function (err, data) {
        originalData = data; // Store original data
        map.on('load', function () {
          addLayers(data);
        });
  
        map.on('styledata', function () {
          addLayers(data);
        });
  
        function addLayers(data) {
          // Add GeoJSON source with clustering
          map.addSource('data', {
            type: 'geojson',
            data: data,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
          });
  
          // Add clustered layer
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'data',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#7851B7',
                5,
                '#633E9E',
                10,
                '#412272'
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                5,
                30,
                10,
                40
              ]
            }
          });
  
          // Add cluster count layer
          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'data',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12
            },
            paint: {
              'text-color': 'white'
            }
          });
  
          // Add other layers with filters
          symbolLayers.forEach(layerId => {
            map.addLayer({
              id: layerId,
              type: 'symbol',
              source: 'data',
              filter: filters[layerId],
              layout: {
                'icon-image': svgIcons[layerId],
                'icon-size': 1,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
              },
              paint: {
                'icon-color': 'white',
                'icon-halo-color': '#000000',
                'icon-halo-width': 1
              }
            });
          });
  
  
          function addLayerFunctionality(layerId) {
            map.on('click', 'clusters', (e) => {
              const features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters']
              });
              const clusterId = features[0].properties.cluster_id;
              map.getSource('data').getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                  if (err) return;
  
                  map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                  });
                }
              );
            });
            map.on('click', layerId, function (e) {
              var coordinates = e.features[0].geometry.coordinates.slice();
              var description = `
                <h3>${e.features[0].properties.Name}</h3>
                <h4><em>${e.features[0].properties.Date}</em></h4>
                <h4><b>${e.features[0].properties.Address}</b></h4>
                <h4>${e.features[0].properties.About}</h4>
                <h4><a href='${e.features[0].properties.Link}'>${e.features[0].properties.Hyperlink}</a></h4>
              `;
              while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
              }
              new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(description)
                .addTo(map);
            });
  
            map.on('mouseenter', layerId, function () {
              map.getCanvas().style.cursor = 'pointer';
            });
  
            map.on('mouseleave', layerId, function () {
              map.getCanvas().style.cursor = '';
            });
  
            var bbox = turf.bbox(data);
            map.fitBounds(bbox, { padding: 50 });
          }
  
          ['articles', 'photos', 'social-media', 'goods'].forEach(layerId => {
            addLayerFunctionality(layerId);
          });
        }
      });
    }
  
    function updateClusterData() {
        let filteredFeatures = originalData.features.filter(feature => {
          let format = feature.properties.Format;
          return !symbolLayers.some(layerId => {
            const visibility = map.getLayoutProperty(layerId, 'visibility');
            return visibility === 'none' && filters[layerId][2] === format;
          });
        });
    
        let updatedData = {
          ...originalData,
          features: filteredFeatures
        };
    
        map.getSource('data').setData(updatedData);
      }
    
      function handleCheckboxChange() {
        const layerId = this.id;
        const visibility = map.getLayoutProperty(layerId, 'visibility');
        
        if (this.checked) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        } else {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
    
        updateClusterData();
      }
    
      map.on('idle', () => {
        const toggleableLayerIds = ['articles', 'photos', 'social-media', 'goods'];
    
        for (const id of toggleableLayerIds) {
          const checkbox = document.getElementById(id);
          if (checkbox) {
            checkbox.addEventListener('change', handleCheckboxChange);
          }
        }
      });
    });