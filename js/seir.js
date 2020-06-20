// these are the parameters for the infectious period and incubation time
var gamma = 1/2;
var sigma = 1/5;

// this is the fraction of observed cases. Should not affect anything at small
// casenumbers.
var p = 0.3;

var derives = function(x, y, Rt, N) {
    // this function calculates the derivatives

		// y[0] is S, y[1] is E, y[2] is I

    var dydx = [];

    dydx[0] = -(Rt*gamma/N)*y[2]*y[0];
    dydx[1] = (Rt*gamma)/N*y[2]*y[0] - sigma*y[1];
    dydx[2] = sigma*y[1] - gamma*y[2];

    return dydx;
}

var derives_given_Rt_N = (Rt, N) => function(x, y) {
    return derives(x, y, Rt, N);
}


function calcInitialConditions(K, Kraw) {
    // see the overleaf notes to understand this.
	currI = 0;
	currR = 0;
	numDays = K.length;
	dataK = [];
	dataKraw = [];

	for (i = 0; i<numDays; i++) {
		//daysPast[i]=i-numDays;

		dataK[i] = {x: i-numDays, y: K[i]};
		dataKraw[i] = {x: i-numDays, y: Kraw[i]};
		currI += (K[i]*Math.exp(-gamma*(numDays-i)))/p;
		currR += (K[i]*(1-Math.exp(-gamma*(numDays-i))))/p;
	}
	//currE = currI*(gamma*(gamma + Rt*sigma))/(sigma*(gamma+sigma));
	// another way: this is designed to make the curves line up
	currE = K[numDays-1]/(sigma*p);
	// possibly better to do some kind of a fit. But well this is an averaged value
    // anyway.
    console.log([currE,currI,currR,dataK,dataKraw]);
	return [currE,currI,currR,dataK,dataKraw];
}


function solveDiffEq(newRt, S0, E0, I0, newN, numDays) {
	var days = [];
	var S = [];
	var E = [];
	var I = [];
	var O = [];

	var xStart = 0,
	    yStart = [S0, E0, I0],
	    h = 0.1;

	var numSteps = numDays/h;
    var rk4 = new RungeKutta4(derives_given_Rt_N(newRt, newN), xStart, yStart, h);
    var datapoint = (a, b) => { return {x: a, y: Math.round(b)}; }
	for (i = 0; i < numSteps; i++) {
	    // this steps through; now check if we should store it
        compartments = rk4.step();

        if ((i % Math.floor(1/h)) == 0) {
            currDay = i/(Math.floor(1/h));
            days[currDay]=currDay;
            S[currDay] = datapoint(currDay, compartments[0]);
            E[currDay] = datapoint(currDay, compartments[1]);
            I[currDay] = datapoint(currDay, compartments[2]);
            O[currDay] = datapoint(currDay, compartments[1]*p*sigma);

            // one should perhaps investigate this!
            //vals1[currDay]=rk4.step()[1];
            //vals2[currDay]=rk4.step()[2];
        }
	}
    return [S,E,I,O];
}


function predictSEIR(caseNums, caseNumsRaw, population, Rt, numDays = 30) {
    var initConditions = calcInitialConditions(caseNums, caseNumsRaw);
    var E0 = initConditions[0],
        I0 = initConditions[1],
        R0 = initConditions[2],
        dataK = initConditions[3],
        dataKraw = initConditions[4];
    var N = population;
    var S0 = N - E0 - I0 - R0;
    
    var SEIO = solveDiffEq(Rt, S0, E0, I0, N, numDays);
    var O = SEIO[3];

    console.log(O);
    return O;
}