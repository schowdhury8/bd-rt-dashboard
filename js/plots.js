function updateFromDropdown(selection) {
    var district = window.districtData[selection];
    var districtName = selection;
    var rtYesterday = lastRt(district);
    document.querySelector('#districts').value = districtName;
    document.querySelector('#death_rt_value').innerText = rtYesterday;
    document.querySelector('#plot_death_rt_value').innerText = rtYesterday;
    document.querySelector('#death_rt').value = rtYesterday;
    makeRtChart(selection);
    document.querySelector('#death_rt').dispatchEvent(new Event('change'));
}

function makeRtChart(districtName) {
    var districtData = window.districtData[districtName];
    var ctx = document.querySelector('#rtChart');
    if(window.myChart && window.myChart !== null){
        window.myChart.destroy();
    }

    var firstDay = findFirstValidDay(districtData['date'], districtData.High_90, function(highRt, threshold=10.) {
        return highRt < threshold;
    });

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
                        max: 7.5
                    }
                }],
                xAxes: [{
                    type: 'time',
                    distribution: 'linear',
                    time: {
                        unit: 'day',
                    },
                    gridLines: {
                        color: "rgba(0, 0, 0, 0)",
                    }, 
                    ticks: {
                        min: new Date(firstDay),
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
            }, 
            annotation: {
                annotations: [
                    {
                        drawTime: "afterDatasetsDraw",
                        type: "line",
                        mode: "horizontal",
                        scaleID: "y-axis-0",
                        value: 1,
                        borderWidth: 3,
                        borderColor: "rgba(255, 124, 124, 0.6)",
                        label: {
                            content: "R(t) = 1",
                            enabled: true,
                            position: "left"
                        }
                    }
                ]
            },
        }
    });
    myChart.update();
}


var googleSheetsUrl = "https://notmahi.github.io/bd-rt-dashboard/static/rt_bd_june_7_web.csv";


function makeDeathPlot (rt) {
    document.querySelector('#plot_death_rt_value').innerText = rt;
    var districtName = document.querySelector('#districts').value;
    var districtData = window.districtData[districtName];

    var caseHistory = window.caseHistory[districtName];
    var counts = dictToList(caseHistory['count']);
    var countsRaw = dictToList(caseHistory['raw']);

    var population = window.populations['Population'][districtName];

    var rtToObserved = (x) => predictSEIR(counts, countsRaw, population, x);

    var firstDay = findFirstValidDay(districtData['date'], countsRaw, function(count, threshold=5) {
        return count >= threshold;
    });

    // We plot all four, upper, lower bounds and current trajectory, and let
    // them play with the possible cases.

    var RtLow = lastElem(districtData['Low_90']);
    var RtHigh = lastElem(districtData['High_90']);
    var RtAvg = lastElem(districtData['ML']);

    var Omax = rtToObserved(RtAvg), 
        Olow = rtToObserved(RtLow),
        Ohigh = rtToObserved(RtHigh);


    console.log(Omax);

    var OProjected = rtToObserved(rt);

    var projectedDates = makeDateTimeseries(lastElem(districtData['date']));

    // Now, it's time to put them in the plot.
    var caseCtx = document.querySelector('#caseChart');
    var chartOptions = {
        type: 'line', //'scatter',
        data: {
            datasets: [{
                label: 'Observed cases (smoothed)',
                data: dictToPoints(counts, districtData['date'], counts),
                radius: 0.5,
            },
            {
                label: 'Observed cases',
                data: dictToPoints(countsRaw, districtData['date'], counts),
                fill: false,
                radius: 1,
                showLines: false,
                pointBackgroundColor: 'black',
                pointRadius: 2,
                borderColor: 'rgba(128, 128, 128, 0)',
            },
            {
                label: 'Currently predicted, likely trajectory',
                data: dictToPoints(Omax, projectedDates, Omax),
                showLine: true,
                fill: false,
                borderColor: "#3e95cd",
                radius: 0.5,
            },
            {
                label: 'Predicted high',
                data: dictToPoints(Ohigh, projectedDates, Ohigh),
                showLine: true,
                fill: '+1',
                backgroundColor: 'rgba(62, 149, 205, 0.2)',
                radius: 0,
                hitRadius: 5, 
                hoverRadius: 5
            },
            {
                label: 'Predicted low',
                data: dictToPoints(Olow, projectedDates, Olow),
                showLine: true,
                backgroundColor: 'rgba(62, 149, 205, 0.2)',
                radius: 0,
                fill: false,
                hitRadius: 0, 
                hoverRadius: 0
            },
            {
                label: 'Projection for given R(t)',
                data: dictToPoints(OProjected, projectedDates, OProjected),
                showLine: true,
                fill: false,
                borderColor: "rgb(52, 0, 104)",
                radius: 0.5,
            }]
        },
        options: {
            maintainAspectRatio:false,
            annotation: {
                annotations: [
                    {
                        drawTime: "afterDatasetsDraw",
                        type: "line",
                        mode: "vertical",
                        scaleID: "x-axis-0",
                        value: new Date(lastElem(districtData.date)),
                        borderWidth: 2,
                        borderColor: "red",
                        label: {
                            content: "Last update: " + new Date(lastElem(districtData.date)).toString().substring(4, 10),
                            enabled: true,
                            position: "top"
                        }
                    }
                ]
            },
            animation: {
                duration: 0
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        suggestedMax: 2 * Math.max(...OProjected.map(z => z.y)),//20000 // MAHI: this number should be fixed dynamically to make the plots line up.
                        max: 2 + 2 * Math.max(Math.max(...Omax.map(z => z.y)), Math.max(...OProjected.map(z => z.y))),
                    }
                }], 
                    
                xAxes: [{
                    type: 'time',
                    distribution: 'linear',
                    time: {
                        unit: 'week',    
                        displayFormats: {
                            week: 'MMM D'
                        }
                    },
                    ticks: {
                        min: new Date(firstDay),
                    }
                    // gridLines: {
                    //     color: "rgba(0, 0, 0, 0)",
                    // }
                }]

            },     
            tooltips: {
                mode: 'x',
                position: 'nearest',
                filter: function(tooltipItem, data) {
                    return [0, 1, 2, 3, 5].includes(tooltipItem.datasetIndex);
                }
            },
            legend: {
                display: true,
                labels: {
                    filter: function(legendItem, data) {
                        return [0, 2, 3, 5].includes(legendItem.datasetIndex);
                    }
                }
            }
        }
    }

    if(window.myCaseChart && window.myCaseChart !== null){
        window.myCaseChart.destroy();
    }

    window.myCaseChart = new Chart(caseCtx, chartOptions);
    window.myCaseChart.update();
}

function resetRt () {
    document.querySelector('#death_rt').value = document.querySelector('#death_rt_value').innerText;
    document.querySelector('#plot_death_rt_value').innerText = document.querySelector('#death_rt_value').innerText;
    document.querySelector('#death_rt').dispatchEvent(new Event('change'));
}