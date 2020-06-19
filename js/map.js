var mymap = L.map('mapid').setView([23.7741701,90.2620907], 7);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 7,
    minZoom: 7,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1Ijoibm90bWFoaSIsImEiOiJja2JmamR3cG8wcDN5MnhudXozNWJhN21mIn0.VjlTbNZiPK0yUsmu3aNAsw'
}).addTo(mymap);


var googleSheetsUrl = "https://notmahi.github.io/bd-rt-dashboard/static/rt_bd_june_7_web.csv";

const Rt_url = "https://notmahi.github.io/bd-rt-dashboard/static/rt_bangladesh.json";
const popUrl = "https://notmahi.github.io/bd-rt-dashboard/static/bd_population.json";
const caseHistoryUrl = "https://notmahi.github.io/bd-rt-dashboard/static/bd_case_history.json";

function handle_rt_data(response) {
    const rtData = response;
    window.districtData = rtData;
    var districtElem = document.querySelector('#districts');

    for (district in rtData) {
        var option = document.createElement('option');
        option.value = district;
        option.innerText = district;
        districtElem.appendChild(option);
    }
    districtElem.value = 'Dhaka City';
    updateFromDropdown('Dhaka City');

    updateMap();

    fetchJSON(popUrl, (response) => {
        window.populations = response;
        fetchJSON(caseHistoryUrl, (response) => {
            window.caseHistory = response;
            document.querySelector('#death_rt').onchange = (e) => makeDeathPlot(e.target.value);
            document.querySelector('#districts').onchange = (e) => updateFromDropdown(e.target.value);

            document.querySelector('#death_rt').dispatchEvent(new Event('change'));
        });
    });
}

fetchJSON(Rt_url, handle_rt_data);


function updateMap() {

    function getColor(rt_now, rt_7days) {
        return ((rt_now >= 1) & (rt_7days >= 1)) ? '#d7191c' :
               ((rt_now < 1) & (rt_7days >= 1)) ? '#fdae61' :
               ((rt_now >= 1) & (rt_7days < 1)) ? '#F2F216' :
                                                 '#1a9641';
    }

    function getDistrictData(key) {
        var district = window.districtData[key];
        return district;
    }
    
    function style(feature) {
        var districtData = getDistrictData(feature.properties.name);
        if (lastElem(districtData.enough_data) === false) {
            var color = '#93936B';
        } else {
            var color = getColor(lastRt(districtData), last7DaysRt(districtData));
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
                var districtName = props.name;
                var district = getDistrictData(districtName);
                var rtYesterday = lastRt(district);
                var rtAvg = last7DaysRt(district);
                flag = true;
            }
        }
        
        this._div.innerHTML = '<h3>COVID-19 Rt Situation Update:</h3>' +  (flag ?
            '<h2>' + districtName + '</h2><h3>R(t) yesterday ' + rtYesterday + '</h3><h3>R(t) average ' + rtAvg +'</h3>'
            : '<h3>Hover over a district</h3>');
        
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

    function onClick(e) {
        var layer = e.target;
        var properties = layer.feature.properties;
        // Here, update the side plots with new properties.
        var districtName = properties.name;
        updateFromDropdown(districtName);
        var district = getDistrictData(districtName);
        var rtYesterday = lastRt(district);
        flag = true;

        // TODO: Fix dummy data
        document.querySelector('#districts').value = districtName;
        document.querySelector('#death_rt_value').innerText = rtYesterday;
        document.querySelector('#plot_death_rt_value').innerText = rtYesterday;
        document.querySelector('#death_rt').value = rtYesterday;
        document.querySelector('#death_rt').dispatchEvent(new Event('change'));
    }
    
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: onClick
        });
    }

    geojson = L.geoJson(geoData, 
        {
            style: style,
            onEachFeature: onEachFeature,
        }
    ).addTo(mymap);
}


