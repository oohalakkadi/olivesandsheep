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
  
  const symbolLayers = ['written-works', 'photography', 'social-media', 'vendors'];
  const filters = {
    'written-works': ['==', 'Format', 'Written Works'],
    'photography': ['==', 'Format', 'Photography'],
    'social-media': ['==', 'Format', 'Social Media'],
    'vendors': ['==', 'Format', 'Vendors']
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
                'icon-image': layerId === 'written-works' ? 'ri-leaf-fill' :
                  layerId === 'photography' ? 'Photography' :
                    layerId === 'social-media' ? 'SocialMedia' : 'Vendors',
                'icon-size': 0.3,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'text-allow-overlap': true,
                'text-ignore-placement': true
              },
              paint: {
                'icon-color': '#412272'
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
  
          ['written-works', 'photography', 'social-media', 'vendors'].forEach(layerId => {
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
        const toggleableLayerIds = ['written-works', 'photography', 'social-media', 'vendors'];
    
        for (const id of toggleableLayerIds) {
          const checkbox = document.getElementById(id);
          if (checkbox) {
            checkbox.addEventListener('change', handleCheckboxChange);
          }
        }
      });
    });