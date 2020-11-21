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

format_data() # prints formatted data which can be outputted to a file (python format_data.py > "out.csv")