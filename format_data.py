import json
import numpy as np
from datetime import datetime

data = json.load(open('./data/2020-11-21/rt_bangladesh.json'))

def format_data(district='Grand Total'): # returns data formatted in csv format by district
    district_dates = list(data['Grand Total']['date'].values())
    district_dates = [datetime.fromtimestamp(i/1000).strftime("%Y-%m-%d") for i in district_dates]
    
    district_rt_data = list(data[district]['ML'].values())

    district_growth_rate_data = list(data[district]['growth_rate_ML'].values())

    district_doubling_time_data = list(data[district]['doubling_time_ML'].values())
    district_doubling_time_data = ['' if i is None else i for i in district_doubling_time_data]

    print('Date,R(t),Growth Rate,Doubling Time')
    for i in range(len(district_rt_data)):
        print(district_dates[i], district_rt_data[i], district_growth_rate_data[i], district_doubling_time_data[i], sep=',')

def format_data_mean(): # returns data formatted in csv format across all districts (if need be)
    dates = []
    rt_data = []
    growth_rate_data = []
    doubling_time_data = []

    for district in data: 
        district_rt_data = list(data[district]['ML'].values())
        rt_data.append(district_rt_data)

        district_growth_rate_data = list(data[district]['growth_rate_ML'].values())
        growth_rate_data.append(district_growth_rate_data)

        district_doubling_time_data = list(data[district]['doubling_time_ML'].values())
        district_doubling_time_data = [0 if i is None else i for i in district_doubling_time_data]
        doubling_time_data.append(district_doubling_time_data)

        district_dates = list(data['Grand Total']['date'].values())
        district_dates = [datetime.fromtimestamp(i/1000).strftime("%Y-%m-%d") for i in district_dates]
        dates.append(district_dates)

    rt_data_mean = np.mean(rt_data, axis=0)
    growth_rate_data_mean = np.mean(growth_rate_data, axis=0)
    doubling_time_data_mean = np.mean(doubling_time_data, axis=0)

    print('Date,R(t),Growth Rate,Doubling Time')
    for i in range(len(dates[0])):
        print(dates[0][i], rt_data_mean[i], growth_rate_data_mean[i], doubling_time_data_mean[i], sep=',')

format_data() # prints formatted data which can be outputted to a file (python format_data.py > "out.csv")
# format_data_mean()