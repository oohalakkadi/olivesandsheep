const olivesLayers = ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'];
const olivesFilters = {
  'articles': ['==', 'Filter', 'Articles'],
  'reports': ['==', 'Filter', 'Reports'],
  'photos': ['==', 'Filter', 'Photos'],
  'videos': ['==', 'Filter', 'Videos'],
  'social-media': ['==', 'Filter', 'Social Media'],
  'goods': ['==', 'Filter', 'Goods & Services']
};

let olivesOriginalData; // Variable to store original GeoJSON data

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
      olivesOriginalData = data; // Store original data
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
        olivesLayers.forEach(layerId => {
          map.addLayer({
            id: layerId,
            type: 'symbol',
            source: 'data',
            filter: olivesFilters[layerId],
            layout: {
              'icon-image': layerId === 'articles' ? 'articles' :
                layerId === 'reports' ? 'reports' :
                  layerId === 'photos' ? 'photos' :
                    layerId === 'videos' ? 'videos' :
                    layerId === 'social-media' ? 'social-photo' :
                      layerId === 'goods' ? 'goods' : '',
              'icon-size': 1.2,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
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
                <h3>${e.features[0].properties.Title}</h3>
                <h4><em>${e.features[0].properties.Date}</em></h4>
                <h4><b>${e.features[0].properties.Address}</b></h4>
                <h4>${e.features[0].properties.Description}</h4>
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

        olivesLayers.forEach(layerId => {
          addLayerFunctionality(layerId);
        });
      }
    });
  }

  function updateClusterData() {
    let filteredFeatures = olivesOriginalData.features.filter(feature => {
      let format = feature.properties.Filter;
      return !olivesLayers.some(layerId => {
        const visibility = map.getLayoutProperty(layerId, 'visibility');
        return visibility === 'none' && olivesFilters[layerId][2] === format;
      });
    });

    let updatedData = {
      ...olivesOriginalData,
      features: filteredFeatures
    };

    map.getSource('data').setData(updatedData);
  }

  function handleCheckboxChange() {
    const layerId = this.id;
    const layer = map.getLayer(layerId);

    if (layer) { // Check if layer exists
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
    }
  }

  function attachEventHandlers() {
    if ($('#toggle-olives-sheep').length && $('.olives-sheep-sub').length) {
      $('#toggle-olives-sheep').off('change').on('change', function () {
        const checked = this.checked;

        $('.olives-sheep-sub').each(function () {
          this.checked = checked;

          const layer = map.getLayer(this.id);
          if (layer) { // Check if layer exists
            try {
              map.setLayoutProperty(this.id, 'visibility', checked ? 'visible' : 'none');
            } catch (e) {
              console.error(`Error setting visibility for layer ${this.id}:`, e);
            }
          }
        });

        updateClusterData();
      });

      $('.olives-sheep-sub').off('change').on('change', function () {
        const anyChecked = $('.olives-sheep-sub:checked').length > 0;
        $('#toggle-olives-sheep').prop('checked', anyChecked);
        handleCheckboxChange.call(this);
      });
    }
  }

  map.on('idle', () => {
    //const toggleableLayerIds = ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'];
    //for (const id of toggleableLayerIds) {
      for (const id of olivesLayers) {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.removeEventListener('change', handleCheckboxChange); // Remove previous handlers
        checkbox.addEventListener('change', handleCheckboxChange);
      }
    }
  });
});
