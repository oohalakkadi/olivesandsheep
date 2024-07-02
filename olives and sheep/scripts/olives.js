const symbolLayers = ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'];
const filters = {
  'articles': ['==', 'Format', 'Articles'],
  'reports': ['==', 'Format', 'Reports'],
  'photos': ['==', 'Format', 'Photos'],
  'videos': ['==', 'Format', 'Videos'],
  'social-media': ['==', 'Format', 'Social Media'],
  'goods': ['==', 'Format', 'Goods & Services']
};

const SPIDERFY_FROM_ZOOM = 14;
let originalData;

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
    originalData = data;
    map.on('load', function () {
      addLayers(data);
      attachEventHandlers();
    });

    map.on('styledata', function () {
      addLayers(data);
      attachEventHandlers();
    });

    function addLayers(data) {
      map.addSource('data', {
        type: 'geojson',
        data: data,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'data',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#7851B7', 5, '#633E9E', 10, '#412272'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40]
        }
      });

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

      symbolLayers.forEach(layerId => {
        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: 'data',
          filter: filters[layerId],
          layout: {
            'icon-image': layerId === 'articles' ? 'articles' : layerId === 'reports' ? 'reports' : layerId === 'photos' ? 'photos' : layerId === 'videos' ? 'videos' : layerId === 'social-media' ? 'social-photo' : layerId === 'goods' ? 'goods' : '',
            'icon-size': 1.2,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });
      });


      const spiderifier = new MapboxglSpiderifier(map, {
        animate: true,
        animationSpeed: 200,
        customPin: true,
        onClick: function (e, spiderLeg) {
          console.log(e);
          console.log(spiderLeg);
      
          const feature = spiderLeg.feature;
      
          if (!feature || !feature.geometry || !feature.geometry.coordinates) {
            console.error('Spider leg feature does not have geometry or coordinates', feature);
            return;
          }
      
          const coordinates = feature.geometry.coordinates.slice();
          const popupContent = `
            <h3>${feature.properties.Name}</h3>
            <h4><em>${feature.properties.Date}</em></h4>
            <h4><b>${feature.properties.Address}</b></h4>
            <h4>${feature.properties.About}</h4>
            <h4><a href='${feature.properties.Link}'>${feature.properties.Hyperlink}</a></h4>
          `;
      
          // Check if the event has a valid lngLat property
          if (e.lngLat && e.lngLat.lng !== undefined) {
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
          } else {
            console.error('Event does not have lngLat', e);
          }
      
          new mapboxgl.Popup()
            .setLngLat(spiderLeg.mapboxMarker.getLngLat())
            .setHTML(popupContent)
            .addTo(map);
        },

        initializeLeg: function (spiderLeg) {
          const pinElem = spiderLeg.elements.pin;
          const feature = spiderLeg.feature;

          iconImage = feature.properties.Format === 'Articles' ? 'articles':
            feature.properties.Format === 'Reports' ? 'reports':
            feature.properties.Format === 'Photos' ? 'photos':
            feature.properties.Format === 'Videos' ? 'videos':
            feature.properties.Format === 'Social Media' ? 'social-photo':
            feature.properties.Format === 'Goods & Services' ? 'goods': '';

          pinElem.style.backgroundImage = `url(${map.style.getImage(iconImage).url})`;
          pinElem.style.backgroundSize = 'contain';
          pinElem.style.width = '40px';
          pinElem.style.height = '40px';
        }
      });

      map.on('click', 'clusters', function (e) {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('data').getClusterExpansionZoom(clusterId, function (err, zoom) {
          if (err) return;
          if (zoom < SPIDERFY_FROM_ZOOM) {
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          } else {
            map.getSource('data').getClusterLeaves(
              clusterId,
              100,
              0,
              function (err, leafFeatures) {
                if (err) return console.error(err);
                const markers = leafFeatures.map(leafFeature => ({
                  ...leafFeature,
                  properties: {
                    ...leafFeature.properties,
                    iconType: 'marker',
                    iconColor: 'red'
                  }
                }));
                spiderifier.spiderfy(features[0].geometry.coordinates, markers);
              }
            );
          }
        });
      });

      symbolLayers.forEach(layerId => {
        map.on('click', layerId, function (e) {
          const coordinates = e.features[0].geometry.coordinates.slice();
          const description = `
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

  let updatedData = { ...originalData, features: filteredFeatures };
  map.getSource('data').setData(updatedData);
}

function handleCheckboxChange() {
  const layerId = this.id;
  const layer = map.getLayer(layerId);
  if (layer) {
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
        if (layer) {
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
  const toggleableLayerIds = ['articles', 'reports', 'photos', 'videos', 'social-media', 'goods'];
  for (const id of toggleableLayerIds) {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.removeEventListener('change', handleCheckboxChange);
      checkbox.addEventListener('change', handleCheckboxChange);
    }
  }
});