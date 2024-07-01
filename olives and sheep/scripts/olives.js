const symbolLayers = ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'];
const filters = {
  'articles': ['==', 'Format', 'Articles'],
  'reports': ['==', 'Format', 'Reports'],
  'photos': ['==', 'Format', 'Photos'],
  'videos': ['==', 'Format', 'Videos'],
  'social-media': ['==', 'Format', 'Social Media'],
  'goods': ['==', 'Format', 'Goods & Services']
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
        attachEventHandlers(); // Attach handlers after layers are added
      });

      map.on('styledata', function () {
        addLayers(data);
        attachEventHandlers(); // Reattach handlers if style is reloaded
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
        console.log('Layer added: clusters'); // Log for clusters layer
      
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
        console.log('Layer added: cluster-count'); // Log for cluster-count layer
      
        // Add other layers with filters
        symbolLayers.forEach(layerId => {
          map.addLayer({
            id: layerId,
            type: 'symbol',
            source: 'data',
            filter: filters[layerId],
            layout: {
              'icon-image': layerId,
              'icon-size': 1.2,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
            }
          });
          console.log('Layer added: ' + layerId); // Log for each symbol layer
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

        symbolLayers.forEach(layerId => {
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
    console.log(`handleCheckboxChange: Layer ID = ${layerId}`); // Debug log
    if (map.getLayer(layerId)) { // Check if layer exists
      const visibility = map.getLayoutProperty(layerId, 'visibility');
      console.log(`Layer ${layerId} visibility = ${visibility}`); // Debug log

      try {
        if (this.checked) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        } else {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      } catch (e) {
        console.error(`Error setting visibility for layer ${layerId}:`, e);
      }

      updateClusterData();
    } else {
      console.warn(`Layer with ID ${layerId} does not exist.`);
    }
  }

  function attachEventHandlers() {
    // Ensure elements exist before attaching handlers
    if ($('#toggle-olives-sheep').length && $('.olives-sheep-sub').length) {
      console.log('Attaching event handlers'); // Debug log

      $('#toggle-olives-sheep').off('change').on('change', function () {
        const checked = this.checked;
        console.log('Master toggle changed:', checked); // Debug log
        $('.olives-sheep-sub').each(function () {
          this.checked = checked;
          console.log('Sub-toggle:', this.id, 'checked:', checked); // Debug log
          if (map.getLayer(this.id)) { // Check if layer exists
            console.log('Setting visibility for layer:', this.id); // Debug log
            try {
              map.setLayoutProperty(this.id, checked ? 'visible' : 'none'); // Directly update visibility
            } catch (e) {
              console.error(`Error setting visibility for layer ${this.id}:`, e);
            }
          } else {
            console.warn(`Layer with ID ${this.id} does not exist.`);
          }
        });
        updateClusterData();
      });

      $('.olives-sheep-sub').off('change').on('change', function () {
        const anyChecked = $('.olives-sheep-sub:checked').length > 0;
        console.log('Sub-toggle changed. Any checked:', anyChecked); // Debug log
        $('#toggle-olives-sheep').prop('checked', anyChecked);
        handleCheckboxChange.call(this);
      });
    } else {
      console.warn('Toggle elements not found');
    }
  }

  map.on('idle', () => {
    const toggleableLayerIds = ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'];

    for (const id of toggleableLayerIds) {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.removeEventListener('change', handleCheckboxChange); // Remove previous handlers
        checkbox.addEventListener('change', handleCheckboxChange);
      }
    }
  });
});
