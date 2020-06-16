var mymap = L.map('mapid').setView([23.7741701,90.2620907], 7);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1Ijoibm90bWFoaSIsImEiOiJja2JmamR3cG8wcDN5MnhudXozNWJhN21mIn0.VjlTbNZiPK0yUsmu3aNAsw'
}).addTo(mymap);


var googleSheetsUrl = "https://notmahi.github.io/bd-rt-dashboard/static/rt_bd_june_7_web.csv";

Papa.parse(googleSheetsUrl, {
	download: true,
    header: true,
	dynamicTyping: true,
	complete: function(results) {
        var districtData = results.data;

		function getColor(rt_now, rt_7days) {
            return ((rt_now >= 1) & (rt_7days >= 1)) ? '#d7191c' :
                   ((rt_now < 1) & (rt_7days >= 1)) ? '#fdae61' :
                   ((rt_now >= 1) & (rt_7days < 1)) ? '#ffffbf' :
                                                     '#1a9641';
        }
        
        function getDistrictData(key) {
            var district = districtData.filter(result => (result.district === key));
            return district;
        }
        
        function style(feature) {
            var districtData = getDistrictData(feature.properties.key);
            if (districtData.length === 0) {
                var color = '#a6d96a';
            } else {
                var color = getColor(districtData[0].rt_yesterday, districtData[0].rt_avg);
            }
            // var color = getColor(feature.properties.key)
            return {
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3'
            };
        }

        var info = L.control();

        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };

        // method that we will use to update the control based on feature properties passed
        info.update = function (props) {
            var flag = false;
            var districtName = '';
            var rtYesterday = 1.;
            var rtAvg = 1.;
            if(props) {
                if (props.key) {
                    var districtData = getDistrictData(props.key);
                    if (districtData.length > 0) {
                        var distritInfo = districtData[0];
                        var districtName = distritInfo.district;
                        var rtYesterday = distritInfo.rt_yesterday;
                        var rtAvg = distritInfo.rt_avg;
                    } else {
                        var districtName = props.key;
                        var rtYesterday = '(not enough cases)';
                        var rtAvg = '(not enough cases)';
                    }
                    flag = true;
                }
            }
            
            this._div.innerHTML = '<h4>COVID-19 Rt Situation Update:</h4>' +  (flag ?
                '<b>' + districtName + '</b><br /> R(t) yesterday ' + rtYesterday + '<br /> R(t) average ' + rtAvg
                : 'Hover over a district');
        };

        info.addTo(mymap);

        function highlightFeature(e) {
            var layer = e.target;
        
            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.9
            });
        
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
            info.update(layer.feature.properties);
        }
        
        function resetHighlight(e) {
            geojson.resetStyle(e.target);
            info.update();
        }
        
        function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight
            });
        }

        geojson = L.geoJson(geoData, 
            {
                style: style,
                onEachFeature: onEachFeature,
            }
        ).addTo(mymap);
	}
});

