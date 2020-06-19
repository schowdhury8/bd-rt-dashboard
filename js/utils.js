const dayConstant = 24 * 60 * 60 * 1000;

function load(url, callback) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
        callback(xhr.response);
        }
    }

    xhr.open('GET', url, true);
    xhr.send('');
}

function fetchJSON(url, callback) {
    fetch(url).then((response) => {
        return response.json();
    }).then((responseJSON) => {
        callback(responseJSON);
    });
}

function dictLength (dict) {
    if(Array.isArray(dict)) {
        return dict.length;
    }
    return Object.keys(dict).length;
}

function lastElem (dict) {
    return dict[dictLength(dict) - 1];
}

function lastRt (district) {
    return lastElem(district.ML);
}

function last7DaysRt(district) {
    const rts = district.ML;
    var lastDay = dictLength(rts);
    var totalRt = 0;
    var totalDays = 0;
    for(var i = 0; i < 7; i++) {
        if((lastDay - i) in rts) {
            totalRt += rts[lastDay - i];
            totalDays += 1;
        }
    }
    if (totalDays === 0) {
        return 1.0;
    }
    else {
        return twoDecimal(totalRt / totalDays);
    }
}

function twoDecimal(x) {
    return Number.parseFloat(x).toFixed(2);
}

function dictToPoints(data, timeLabels, enoughData, neededType) {
    var selectionFunction = (x, data) => {
        // return data;
        if (typeof neededType === 'undefined') {
            return data;
        } else {
            return x === neededType ? data : null
        }
    }
    const length = dictLength(data);
    var points = [];
    for(var i = 0; i < length; i++) {
        points.push({
            t: new Date(timeLabels[i]),
            y: selectionFunction(enoughData[i], data[i]),
        });
    }
    return points;
}

function dictToList(dictionary) {
    var length = dictLength(dictionary);
    var list = [];
    for(var i = 0; i < length; i++) {
        list.push(dictionary[i]);
    }
    return list;
}

function makeDateTimeseries(initTimeStamp, numDays=60) {
    var dateList = [];
    for(var i = 0; i < numDays; i++) {
        dateList.push(new Date(initTimeStamp + i * dayConstant));
    }
    return dateList;
}

function findFirstValidDay(dateSeries, caseCountSeries, conditionFunc) {
    var firstDate = dateSeries[0];
    console.log(new Date(firstDate));
    var size = dictLength(caseCountSeries);
    for(var i = 5; i < size; i++) {
        if (conditionFunc(caseCountSeries[i])) {
            firstDate = Math.max(firstDate, dateSeries[i] - 5 * dayConstant);
            break;
        }
    }
    return firstDate;
}

window.districtData = null;
window.populations = null;
window.caseHistory = null;