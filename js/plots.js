var googleSheetsUrl = "https://notmahi.github.io/bd-rt-dashboard/static/rt_bd_june_7_web.csv";

Papa.parse(googleSheetsUrl, {
	download: true,
    header: true,
	dynamicTyping: true,
	complete: function(results) {
        var districtData = results.data;
        var districtElem = document.querySelector('#districts');
        districtData.forEach((district) => {
            var option = document.createElement('option');
            option.value = district.district;
            option.innerText = district.district;
            districtElem.appendChild(option);
        });
    }
});

/**
 * this is the target differential equations
 * @param  {Array}   y     It is an unknown function of x which we would like to approximate
 * @param  {Number}  x     x
 * @return {Array}   dydx  The rate at which y changes, is a function of x and of y
 */
var slope = 2;
// Replace this with the SEIR equations
var derives = function(x, y) {
    // you need to return the integration
    var dydx = []

    dydx[0] = y[0] + y[1]
    dydx[1] = slope * y[1] + y[2]
    dydx[2] = 3 * y[2]

    return dydx
}

var eqn_given_rt = (slope) => function (x, y) {
    // you need to return the integration
    var dydx = []

    dydx[0] = y[0] + y[1]
    dydx[1] = slope * y[1] + y[2]
    dydx[2] = 3 * y[2]

    return dydx
}

function makeDeathPlot (rt) {
    var xaxis = [];
    var vals1 = [];
    var vals2 = [];
    

    document.querySelector('#plot_death_rt_value').innerText = rt;

    function solveDiffEq() {
        var xStart = 0,
            yStart = [1, 5, 10],
            h = 0.1
    
        var rk4 = new RungeKutta4(eqn_given_rt(rt), xStart, yStart, h)
        for (i =0; i< 6; i++) {
            xaxis[i] =i;
            vals1[i]=rk4.step()[1]
            vals2[i]=rk4.step()[2]
        }
    }

    var ctx = document.getElementById('deathChart');
    var x = 9;

    var myChart = new Chart(ctx, {
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
    });


    var sickCtx = document.getElementById('sickChart');

    var mySickChart = new Chart(sickCtx, {
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
    });


    solveDiffEq();
	myChart.data.datasets[0].data=vals1;
	myChart.data.datasets[1].data=vals2;
    myChart.update();
    
    // TODO: Get the sickness data
    var sickVals1 = vals1.map(x => x*x);
    var sickVals2 = vals2.map(x => x*x);
    mySickChart.data.datasets[0].data=sickVals1;
	mySickChart.data.datasets[1].data=sickVals2;
    mySickChart.update();
}

function resetRt () {
    document.querySelector('#death_rt').value = document.querySelector('#death_rt_value').innerText;
    document.querySelector('#plot_death_rt_value').innerText = document.querySelector('#death_rt_value').innerText;
    document.querySelector('#death_rt').dispatchEvent(new Event('change'));
}