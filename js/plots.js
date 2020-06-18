function updateFromDropdown(selection) {
    var district = window.districtData[selection];
    var districtName = selection;
    var rtYesterday = lastRt(district);
    document.querySelector('#districts').value = districtName;
    document.querySelector('#death_rt_value').innerText = rtYesterday;
    document.querySelector('#plot_death_rt_value').innerText = rtYesterday;
    document.querySelector('#death_rt').value = rtYesterday;
    document.querySelector('#death_rt').dispatchEvent(new Event('change'));
    makeRtChart(selection);
}
document.querySelector('#districts').onchange = (e) => updateFromDropdown(e.target.value);

function makeRtChart(districtName) {
    var districtData = window.districtData[districtName];
    var ctx = document.querySelector('#rtChart');
    if(window.myChart && window.myChart !== null){
        window.myChart.destroy();
    }
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            //labels: ['1', '2','3','4','5','6'],
            // labels: districtData.date,
            datasets: [{
                label: '90% High',
                data: dictToPoints(districtData.High_90, districtData.date, districtData.enough_data),
                borderWidth: 0,
                fill:false,
            }, 
            {
                label: '90% High (confident)',
                data: dictToPoints(districtData.High_90, districtData.date, districtData.enough_data, false),
                borderWidth: 0,
                fill:false,
                radius: 0,
                hitRadius: 0, 
                hoverRadius: 0
            }, 
            {
                label: 'Most likely R',
                data: dictToPoints(districtData.ML, districtData.date, districtData.enough_data),
                borderWidth: 3,
                borderColor: "#3e95cd",
                fill: false,
            },
            {
                label: '90% Low',
                data: dictToPoints(districtData.Low_90, districtData.date, districtData.enough_data),                            
                borderWidth: 3,
                fill: '-3',
            },
            {
                label: '90% Low (confident)',
                data: dictToPoints(districtData.Low_90, districtData.date, districtData.enough_data, false),                            
                borderWidth: 3,
                backgroundColor: 'rgba(255, 173, 173, 0.4)',
                fill: '-3',
                radius: 0,
                hitRadius: 0, 
                hoverRadius: 0
            }]
        },
        options: {
            maintainAspectRatio:false,
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        // max: 10
                    }
                }],
                xAxes: [{
                    type: 'time',
                    distribution: 'linear',
                    time: {
                        unit: 'day'
                    },
                    gridLines: {
                        color: "rgba(0, 0, 0, 0)",
                    }
                }]
                /*xAxes: [{
                    type: 'linear'
                }]*/
            }, 
            elements: { 
                point: { 
                    radius: 0.5,
                    hitRadius: 3, 
                    hoverRadius: 4
                } 
            },
            legend: {
                display: false
            }
        }
    });
    myChart.update();
}

var googleSheetsUrl = "https://notmahi.github.io/bd-rt-dashboard/static/rt_bd_june_7_web.csv";

/**
 * this is the target differential equations
 * @param  {Array}   y     It is an unknown function of x which we would like to approximate
 * @param  {Number}  x     x
 * @return {Array}   dydx  The rate at which y changes, is a function of x and of y
 */
var eqn_given_rt = (slope) => function (x, y) {
    // you need to return the integration
    var dydx = []

    dydx[0] = y[0] + y[1]
    dydx[1] = slope * y[1] + y[2]
    dydx[2] = 3 * y[2]

    return dydx
}

function solveDiffEq(rt) {
    var xaxis = [];
    var vals1 = [];
    var vals2 = [];
    var xStart = 0,
        yStart = [1, 5, 10],
        h = 0.1

    var rk4 = new RungeKutta4(eqn_given_rt(rt), xStart, yStart, h)
    for (i =0; i< 6; i++) {
        xaxis[i] =i;
        vals1[i]=rk4.step()[1]
        vals2[i]=rk4.step()[2]
    }
    return [xaxis, vals1, vals2];
}

function makeDeathPlot (rt) {
    document.querySelector('#plot_death_rt_value').innerText = rt;

    results = solveDiffEq(rt);
    var xaxis = results[0], vals1 = results[1], vals2 = results[2];

    // TODO: Get the sickness data
    var sickVals1 = vals1.map(x => x*x);
    var sickVals2 = vals2.map(x => x*x);

    var chartOptions = {
        type: 'line',
        data: {
            //labels: ['1', '2','3','4','5','6'],
            labels: xaxis,
            datasets: [{
                label: 'Solving an equation',
                data: vals1,
                borderWidth: 3,
                fill:false
            }, {
                label: 'Another thing',
                data: vals2,
                borderWidth: 3,
                borderColor: "#3e95cd",
                fill:false
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
                /*xAxes: [{
                    type: 'linear'
                }]*/
            }
        }
    };

    var myChart = new Chart(document.getElementById('deathChart'), chartOptions);
    var mySickChart = new Chart(document.getElementById('sickChart'), chartOptions);

	myChart.data.datasets[0].data=vals1;
	myChart.data.datasets[1].data=vals2;
    myChart.update();
    
    mySickChart.data.datasets[0].data=sickVals1;
	mySickChart.data.datasets[1].data=sickVals2;
    mySickChart.update();
}

function resetRt () {
    document.querySelector('#death_rt').value = document.querySelector('#death_rt_value').innerText;
    document.querySelector('#plot_death_rt_value').innerText = document.querySelector('#death_rt_value').innerText;
    document.querySelector('#death_rt').dispatchEvent(new Event('change'));
}