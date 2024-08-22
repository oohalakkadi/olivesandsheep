const symbolLayers = ['none', 'settlers-harassment', 'army/police-harassment', 'settlers-violence', 'army/police-violence', 'detain/arrest', 'military-zone', 'confiscations', 'property-damage', 'sheep-theft', 'settler-building', 'unusual-event', 'other']; //CHANGE TO REFLECT FILTER CRITERIA
const filters = {
  'none': ['==', 'Event Type', 'No special events'],
  'settlers-harassment': ['==', 'Event Type', 'Settlers harassment'],
  'army/police-harassment': ['==', 'Event Type', 'Army/Police harassment'],
  'settlers-violence': ['==', 'Event Type', 'Settlers violence'],
  'army/police-violence': ['==', 'Event Type', 'Army/Police violence'],
  'detain/arrest': ['==', 'Event Type', 'Detain/Arrest'],
  'military-zone': ['==', 'Event Type', 'Close military zone'],
  'confiscations': ['==', 'Event Type', 'Confiscations'],
  'property-damage': ['==', 'Event Type', 'Property damage'],
  'sheep-theft': ['==', 'Event Type', 'Theft of sheep'],
  'settler-building': ['==', 'Event Type', 'New settlers building'],
  'unusual-event': ['==', 'Event Type', 'Unusual evevnt'],
  'other': ['!in', 'Event Type', [
    'No special events', 
    'Settlers harassment', 
    'Army/Police harassment', 
    'Settlers violence', 
    'Army/Police violence', 
    'Detain/Arrest', 
    'Close military zone', 
    'Confiscations', 
    'Property damage', 
    'Theft of sheep', 
    'New settlers building', 
    'Unusual evevnt'
  ]]
};

let originalData; // Variable to store original GeoJSON data

$(document).ready(function () {
  $.ajax({
    type: "GET",
    url: 'https://docs.google.com/spreadsheets/d/1Q7qY-6Ski2z-jIJvWTaG1LtnYEdI93LlwQuPAfPuQOI/gviz/tq?tqx=out:csv&sheet=Sheet1', 
    dataType: "text",
    success: function (csvData) {
      makeGeoJSON(csvData);
    }
  });

  function makeGeoJSON(csvData) {
    csv2geojson.csv2geojson(csvData, {
      latfield: 'latitude',
      lonfield: 'longitude',
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
          paint: { //EDIT COLORS
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
              'icon-image': layerId === 'articles' ? 'articles' : //EDIT LAYER IDS
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

        symbolLayers.forEach(layerId => {
          addLayerFunctionality(layerId);
        });
      }
    });
  }

  function updateClusterData() {
    let filteredFeatures = originalData.features.filter(feature => {
      let format = feature.properties.Filter;
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

  function attachEventHandlers() { //CHANGE HANDLERS
    // Ensure elements exist before attaching handlers 
    if ($('#toggle-mistaclim').length && $('.mistaclim-sub').length) {
      $('#mistaclim-sheep').off('change').on('change', function () {
        const checked = this.checked;

        $('.mistaclim-sub').each(function () {
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

      $('.mistaclim-sub').off('change').on('change', function () {
        const anyChecked = $('.mistaclim-sub:checked').length > 0;
        $('#toggle-mistaclim').prop('checked', anyChecked);
        handleCheckboxChange.call(this);
      });
    }
  }

  map.on('idle', () => {
    for (const id of symbolLayers) {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.removeEventListener('change', handleCheckboxChange); // Remove previous handlers
        checkbox.addEventListener('change', handleCheckboxChange);
      }
    }
  });
});
