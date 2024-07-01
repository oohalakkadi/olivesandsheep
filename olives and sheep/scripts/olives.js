var symbolLayers = ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'];
// var symbolLayers = ['articles', 'reports', 'photos', 'videos', 'social-photo', 'social-video', 'social-text', 'goods'];
var filters = {
  'articles': ['==', 'Format', 'Articles'],
  'reports': ['==', 'Format', 'Reports'],
  'photos': ['==', 'Format', 'Photos'],
  'videos': ['==', 'Format', 'Videos'],
  'social-media': ['==', 'Format', 'Social Media'],
  // 'social-photo': ['==', 'Format', 'Social Media'] && ['==', 'Social Media Format', 'Photo'],
  // 'social-video': ['==', 'Format', 'Social Media'] && ['==', 'Social Media Format', 'Video'],
  // 'social-text': ['==', 'Format', 'Social Media'] && ['==', 'Social Media Format', 'Text'],
  'goods': ['==', 'Format', 'Goods & Services']
};

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
    }, function (err, oliveData) {
      originalData = oliveData; // Store original data
      map.on('load', function () {
        addLayers(data);
      });

      map.on('styledata', function () {
        addLayers(oliveData);
      });

      function addLayers(oliveData) {
        // Add GeoJSON source with clustering
        map.addSource('oliveData', {
          type: 'geojson',
          data: oliveData,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        // Add clustered layer
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'oliveData',
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
          source: 'oliveData',
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
            source: 'oliveData',
            filter: filters[layerId],
            layout: {
              // connect tags to mapbox studio spritesheet
              'icon-image': layerId === 'articles' ? 'articles' :
                layerId === 'reports' ? 'reports' :
                  layerId === 'photos' ? 'photos' :
                    layerId === 'videos' ? 'videos' :
                    layerId === 'social-media' ? 'social-photo' :
                      layerId === 'goods' ? 'goods' : '',
              'icon-size': 1.2,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
            },
          });
        });

        function addLayerFunctionality(layerId) {
          map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
              layers: ['clusters']
            });
            const clusterId = features[0].properties.cluster_id;
            map.getSource('oliveData').getClusterExpansionZoom(
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

        ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'].forEach(layerId => {
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

    map.getSource('oliveData').setData(updatedData);
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
  
  $('#toggle-olives-sheep').change(function () {
    const checked = this.checked;
    $('.olives-sheep-sub').each(function () {
      this.checked = checked;
      map.setLayoutProperty(this.id, checked ? 'visible' : 'none'); // Directly update visibility
    });
    updateClusterData();
  });

  // Event handler for sub-checkboxes
  $('.olives-sheep-sub').change(function () {
    const anyChecked = $('.olives-sheep-sub:checked').length > 0;
    $('#toggle-olives-sheep').prop('checked', anyChecked);
    handleCheckboxChange.call(this);
  });

  map.on('idle', () => {
    const toggleableLayerIds = ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'];

    for (const id of toggleableLayerIds) {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', handleCheckboxChange);
      }
    }
  });
});
