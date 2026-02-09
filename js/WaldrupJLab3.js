// Jon Waldrup
// GEOG 572 Lab 3 
// 02/08/2026

console.log("JS Loaded");

function buildMap(divId) {

  // create the map
  var map = L.map(divId).setView([44.1, -114.7], 6);

  // basemap
  var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  var baseMaps = { "OpenStreetMap": osm };
  var overlays = {};

  var layerControl = L.control.layers(baseMaps, overlays, { collapsed: false }).addTo(map);

  // Beds legend (bottom right)
  var bedsLegend = L.control({ position: "bottomright" });
  bedsLegend.onAdd = function () {
    var div = L.DomUtil.create("div", "legend");
    div.innerHTML += "<h4>Beds</h4>";
    div.innerHTML += '<div style="font-size:12px; margin-bottom:6px;">Circle size = number of beds</div>';
    div.innerHTML += "<div><span class='legend-circle' style='width:10px;height:10px;'></span> 1–25</div>";
    div.innerHTML += "<div><span class='legend-circle' style='width:16px;height:16px;'></span> 26–100</div>";
    div.innerHTML += "<div><span class='legend-circle' style='width:22px;height:22px;'></span> 101–300</div>";
    div.innerHTML += "<div><span class='legend-circle' style='width:28px;height:28px;'></span> 300+</div>";
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  };
  bedsLegend.addTo(map);

  // Drive-time legend (bottom left)
  var drivetimeLegend = L.control({ position: "bottomleft" });
  drivetimeLegend.onAdd = function () {
    var div = L.DomUtil.create("div", "legend");
    div.innerHTML += "<h4>Number of hospital beds within drive-times</h4>";
    // (keep your color patches here)
    div.innerHTML += "<div><span class='legend-box' style='background:#f3eddc'></span> Some facilities, no beds</div>";
    div.innerHTML += "<div><span class='legend-box' style='background:#e3b4b5'></span> Up to 50 reachable beds</div>";
    div.innerHTML += "<div><span class='legend-box' style='background:#c96575'></span> 50–150 reachable beds</div>";
    div.innerHTML += "<div><span class='legend-box' style='background:#a13b5d'></span> 150–400 reachable beds</div>";
    div.innerHTML += "<div><span class='legend-box' style='background:#6a1a3a'></span> Major regional capacity (400+)</div>";
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  };

  // color function
  function getBedColor(bedsRaw) {
    var beds = Number(bedsRaw) || 0;
    return beds > 400 ? "#6a1a3a" :
           beds > 150 ? "#a13b5d" :
           beds > 50  ? "#c96575" :
           beds > 0   ? "#e3b4b5" :
                        "#f3eddc";
  }

  // We'll fit to both layers once both fetches finish
  var hospitalsLayer = null;
  var drivetimeLayer = null;

  function fitAll() {
    if (hospitalsLayer && drivetimeLayer) {
      var group = L.featureGroup([hospitalsLayer, drivetimeLayer]);
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  }

  // Hospitals
  fetch("data/idahoHospitals.geojson")
    .then(r => r.json())
    .then(data => {
      hospitalsLayer = L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
          var beds = feature.properties.BEDS || 0;
          var radius = Math.sqrt(beds) * 0.6;
          return L.circleMarker(latlng, {
            radius: radius,
            fillColor: "#1f78b4",
            color: "#084594",
            weight: 1,
            fillOpacity: 0.8
          });
        },
        onEachFeature: function (feature, layer) {
          var p = feature.properties;
          var popupHTML =
            "<b>" + (p.NAME ?? "") + "</b>" +
            "<br>City: " + (p.CITY ?? "") +
            "<br>County: " + (p.COUNTY ?? "") +
            "<br><b>Beds:</b> " + (p.BEDS ?? "") +
            "<br>Type: " + (p.TYPE ?? "") +
            "<br>Trauma Center: " + (p.TRAUMA ?? "") +
            "<br>Helipad: " + (p.HELIPAD ?? "");
          layer.bindPopup(popupHTML);
        }
      });

      hospitalsLayer.addTo(map);
      layerControl.addOverlay(hospitalsLayer, "Hospitals (Beds)");
      fitAll();
    });

  // Drive-times
  fetch("data/HospitalBedCountsWithinDrivetimes.json")
    .then(r => r.json())
    .then(data => {
      drivetimeLayer = L.geoJSON(data, {
        style: function (feature) {
          var beds = Number(feature.properties.SUM_Beds) || 0;
          return {
            color: "#555",
            weight: 1,
            fillColor: getBedColor(beds),
            fillOpacity: 0.6
          };
        },
        onEachFeature: function (feature, layer) {
          var beds = Number(feature.properties.SUM_Beds) || 0;
          layer.bindPopup("<b>Beds within drive-time polygon:</b><br>" +
                          beds.toLocaleString() + " beds (sum)");
        }
      });

      layerControl.addOverlay(drivetimeLayer, "Drive-time polygons (Sum beds)");
      drivetimeLayer.addTo(map);

      // legend on by default because layer starts ON
      drivetimeLegend.addTo(map);

      // toggle legend with layer
      map.on("overlayadd", function (e) {
        if (e.layer === drivetimeLayer) drivetimeLegend.addTo(map);
      });
      map.on("overlayremove", function (e) {
        if (e.layer === drivetimeLayer) map.removeControl(drivetimeLegend);
      });

      fitAll();
    });
}

// ✅ Two identical maps (each has both layers)
buildMap("map1");
buildMap("map2");


