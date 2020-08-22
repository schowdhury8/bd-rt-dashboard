import json
import logging
import os
import sys
import traceback

import numpy as np
import pandas as pd
import pickle as pkl

from matplotlib.dates import date2num, num2date
from matplotlib import dates as mdates

from scipy import stats as sps
from scipy.interpolate import interp1d

import requests
import re


EXPORT_DIR = os.environ.get('COVID_DATA_DIRECTORY') or '.'
if os.environ.get('COVID_DEPLOY'):
    logging.basicConfig(filename='deploy_logs.log',level=logging.DEBUG)

def preprocess_data_a2i_url():
    logging.info('Downloading data...')
    A2I_URL = 'http://cdr.a2i.gov.bd/positive_case_data/'
    r = requests.get(A2I_URL)
    urls = re.findall("[0-9\-]+.csv", r.text)
    last_day_url = urls[-1]
    data = pd.read_csv(A2I_URL + last_day_url)

    pivoted = pd.pivot_table(data, 
                            values='positive_cases', 
                            index='dis_name', 
                            columns='tdate', 
                            fill_value=0, ).iloc[1:, ::-1].iloc[:, 1:]

    replacement_dict = {
        'Nawabganj':	'Chapainawabganj',
        'Chittagong':	'Chattogram',
        'Comilla':	'Cumilla',
        'Dhaka':	'Dhaka City',
        'Maulvibazar':	'Moulvibazar',
        'Patuakhali':	'Potuakhali'
    }

    for key, val in replacement_dict.items():
        pivoted.index = pivoted.index.str.replace(key, val)

    pivoted = pivoted.sort_index()
    pivoted.loc['Grand Total'] = pivoted.sum(axis=0)
    return pivoted.T

def preprocess_data_gdrive_url():
    DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR1FLQgrJjty6nOloHKJG_FuoByQ-6_Pt-i0rsBaZ63pxD3PCsMXBFhE0BVSEhAs5y3DtX1Np_D1YcG/pub?gid=2139694521&single=true&output=csv"
    data = pd.read_csv(DATA_URL, 
                        usecols=[0] + list(range(1, 331, 3)),
    ).iloc[1:, :]

    data = data.T

    data = data.rename(columns={i : data.iloc[0, i-1] for i in range(len(data.columns))}).iloc[1:, :]
    data = data.iloc[:, :-3] # Dropping the columns after total
    return data


def preprocess_data():
    if os.environ.get('COVID_DEPLOY') == '1':
        data = preprocess_data_a2i_url()
    else:
        data = preprocess_data_gdrive_url()

    # TODO: Always check on this line to make sure how many days to trim at the end
    data = data.iloc[7:, :] # Dropping the rows until 6/22

    data.index = pd.to_datetime(data.index)
    data = data.replace(to_replace='Not Given', value=np.nan).astype('float', errors='ignore').interpolate().clip(lower=0).round().fillna(0)

    os.makedirs(EXPORT_DIR, exist_ok=True)

    data.to_csv(os.path.join(EXPORT_DIR, 'data_export.csv'))

    json_dict = {}

    for column in data.columns:
        district_data = data[column].iloc[::-1]
        district_data_smoothed = district_data.rolling(7, min_periods=1).mean(std=2).round()
        data_with_raw = pd.DataFrame({
            'count': district_data_smoothed,
            'raw': district_data,
        }, index=district_data.index)
        json_dict[column] = json.loads(data_with_raw.reset_index().to_json())

    with open(os.path.join(EXPORT_DIR, 'bd_case_history.json'), 'w') as f:
        json.dump(json_dict, f)


def calculate_rt():
    def batch_estimate_rt(data_list, region_name_list, serial_interval=7, cutoff=10, rtmax=12, ci1=0.9, ci2=0.5, spread=1.0):
        '''
        this is just a wrapper around estimate_rt. see the docstring for estimate_rt for documentation
        
        data_list:        a list of data parameter accepted by estimate_rt
        region_name_list: a list of region_name parameter accepted by estimate_rt

        return: a list of rts for each region in data_list
        '''
        assert(len(data_list) == len(region_name_list))
        rt_list = []
        for data, region_name in zip(data_list, region_name_list):
            rt = estimate_rt(data, region_name, serial_interval, cutoff, rtmax, ci1, ci2, spread)
            rt_list.append(rt)

        return rt_list



    def estimate_rt(data, region_name, serial_interval=7, cutoff=10, rtmax=12, ci1=0.9, ci2=0.5, spread=1.0):
        '''
        data: pandas DataFrame of date and number of tested positives (cumulative). read data from csv with 
            the following command

        data = pd.read_csv(
            filepath
            usecols=[0, 1],
            parse_dates=[0],
            index_col=[0],
            names=['date', 'positive'],
            header=None,
            skiprows=1,
            squeeze=False,
        ).sort_index() 

        serial_interval: serial interval of covid -19
        cutoff:          threshold for number of new positive cases to be detected on a single day.
        rtmax:           max allowed value for Rt   
        
        returns: a pandas Dataframe of date, ML estimate of Rt and ci1, and ci2 percent error bounds. (default: 90% and 50%) 
        '''
        gamma = 1/serial_interval
        rt_range = np.linspace(0, rtmax, rtmax * 100 + 1)

        
        logging.debug(f"estimating Rt for {region_name}...")

        cases = data['positive']
        sigmas = np.linspace(1 / 20, 1, 20)

        new, smoothed = prepare_cases(cases, cutoff=cutoff)
        result = {}

        # if not enough cases, send rt=1 with error bars 0, inf
        
        date = data.reset_index()['date']
        ml = np.ones(len(date))
        low1 = np.zeros(len(date))
        high1 = np.ones(len(date))*10
        low2 = np.zeros(len(date))
        high2 = np.ones(len(date))*10
        enough_data = np.zeros(len(date)).astype(bool)
        result_no_prior = pd.DataFrame({ #"date":date, 
                                        "ML":ml, 
                            f"Low_{ci1*100:.0f}":low1, 
                            f"High_{ci1*100:.0f}":high1,
                            f"Low_{ci2*100:.0f}":low2, 
                            f"High_{ci2*100:.0f}":high2,
                            "enough_data" : enough_data
                            }, index=date)
    #     result_no_prior.index = result_no_prior.date
        
        if len(smoothed) == 0:
            result_no_prior = compute_growth_rate_doubling_time(result_no_prior)
            return result_no_prior


        # Holds all posteriors with every given value of sigma
        result['posteriors'] = []

        # Holds the log likelihood across all k for each value of sigma
        result['log_likelihoods'] = []
        
        for sigma in sigmas:
            posteriors, log_likelihood = get_posteriors(smoothed, gamma, rt_range, sigma=sigma)
            result['posteriors'].append(posteriors)
            result['log_likelihoods'].append(log_likelihood)


        total_log_likelihoods = result['log_likelihoods']

        # Select the index with the largest log likelihood total
        max_likelihood_index = np.argmax(total_log_likelihoods)

        # Select the value that has the highest log likelihood
        sigma = sigmas[max_likelihood_index]

        posteriors = result['posteriors'][max_likelihood_index]
        assert np.all(np.isfinite(posteriors)), "All probability density must be finite"
        hdis1 = highest_density_interval(posteriors, p=ci1)
        hdis2 = highest_density_interval(posteriors, p=ci2)
        most_likely = posteriors.idxmax().rename('ML')
        diff = hdis2.diff(axis=1).reset_index()[f"High_{ci2*100:.0f}"]
        
        result_computed = pd.concat([most_likely, hdis1, hdis2], axis=1).iloc[1:].reset_index()
        result_computed['enough_data'] = diff < 1
        result_computed.index = result_computed.date
        result_computed = result_computed.dropna()
        
        result_no_prior.loc[result_computed.index] = result_computed
        result_no_prior = compute_growth_rate_doubling_time(result_no_prior)
        return result_no_prior.reset_index()


    def compute_growth_rate_doubling_time(results):
        def doubling_time(x):
            return 'doubling_time', (7. * np.log(2.)) / (x - 1.)
        
        def growth_rate(x):
            return 'growth_rate', (np.exp((x - 1.) / 7.) - 1.)

        for column in ['ML', 'Low_50', 'High_50', 'Low_90', 'High_50']:
            for fn in [growth_rate, doubling_time]:
                name, value = fn(results[column])
                results[f'{name}_{column}'] = value
        return results


    def highest_density_interval(pmf, p=0.9, debug=False):
        # If we pass a DataFrame, just call this recursively on the columns
        if isinstance(pmf, pd.DataFrame):
            return pd.DataFrame(
                [highest_density_interval(pmf[col], p=p) for col in pmf], index=pmf.columns
            )

        to_sum = np.insert(pmf.values, 0, 0)
        cumsum = np.cumsum(to_sum)
        # N x N matrix of total probability mass for each low, high
        total_p = cumsum - cumsum[:, None]

        # Return all indices with total_p > p
        lows, highs = (total_p > p).nonzero()

        # Find the smallest range (highest density)
        best = (highs - lows).argmin()

        low = pmf.index[lows[best]]
        high = pmf.index[highs[best]]

        return pd.Series([low, high], index=[f'Low_{p*100:.0f}', f'High_{p*100:.0f}'])


    def prepare_cases(cases, cutoff=5):
        new_cases = cases
    #     # NOTE: CHANGED HERE
    # #     smoothed = new_cases.rolling(7, win_type='gaussian', min_periods=1, center=True).mean(std=2).round()

    #     # First value of diff is always NaN, so removing that
    #     new_cases = new_cases.dropna()
        smoothed = new_cases.rolling(7, min_periods=1).mean(std=2).round()
        
        assert np.all(np.isfinite(smoothed)), "All values must be finite"

        idx_start = len(smoothed)
        for idx in range(len(smoothed)):
            if smoothed.iloc[idx] >= cutoff:
                idx_start = idx
                break
    #     idx_start = np.searchsorted(smoothed.values, cutoff)
        # NOTE: END OF CHANGED
        
        smoothed_prev = smoothed.iloc[:]
        smoothed = smoothed.iloc[idx_start:]

        if not np.all(smoothed > 0.):
            smoothed[smoothed < 1] = 1
        original = new_cases.loc[smoothed.index]
        return original, smoothed

    def get_posteriors(sr, gamma, rt_range, sigma=0.15):

        # (1) Calculate Lambda
        lam = sr[:-1].values * np.exp(gamma * (rt_range[:, None] - 1))

        # (2) Calculate each day's likelihood
        likelihoods = pd.DataFrame(
            data=sps.poisson.pmf(sr[1:].values, lam), index=rt_range, columns=sr.index[1:]
        )

        # (3) Create the Gaussian Matrix
        process_matrix = sps.norm(loc=rt_range, scale=sigma).pdf(rt_range[:, None])

        # (3a) Normalize all rows to sum to 1
        process_matrix /= process_matrix.sum(axis=0)

        # (4) Calculate the initial prior
        # prior0 = sps.gamma(a=4).pdf(rt_range)
        prior0 = np.ones_like(rt_range) / len(rt_range)
        prior0 /= prior0.sum()

        # Create a DataFrame that will hold our posteriors for each day
        # Insert our prior as the first posterior.
        posteriors = pd.DataFrame(index=rt_range, columns=sr.index, data={sr.index[0]: prior0})

        # We said we'd keep track of the sum of the log of the probability
        # of the data for maximum likelihood calculation.
        log_likelihood = 0.0

        # (5) Iteratively apply Bayes' rule
        for previous_day, current_day in zip(sr.index[:-1], sr.index[1:]):

            # (5a) Calculate the new prior
            current_prior = process_matrix @ posteriors[previous_day]

            # (5b) Calculate the numerator of Bayes' Rule: P(k|R_t)P(R_t)
            numerator = likelihoods[current_day] * current_prior

            # (5c) Calcluate the denominator of Bayes' Rule P(k)
            denominator = np.sum(numerator)

            # Execute full Bayes' Rule
            posteriors[current_day] = numerator / denominator

            # Add to the running sum of log likelihoods
            epsilon = 1e-16
            log_likelihood += np.log(denominator+epsilon)

        return posteriors, log_likelihood
    
    df = pd.read_csv(os.path.join(EXPORT_DIR, 'data_export.csv'),
                parse_dates=[0],
                index_col=[0],).iloc[::-1, :]
                
    dist_df_dict = df

    rt_df_dict = {}

    for d in dist_df_dict.keys():
        try: 
            new_series = pd.DataFrame({'positive':dist_df_dict[d]})
            new_series.index = new_series.index.rename('date')
            rt_df_dict[d] = estimate_rt(new_series, d).reset_index()
        except Exception as e:
            traceback.print_exc()
            assert False

    with open(os.path.join(EXPORT_DIR, 'rt_dict.pkl'), 'wb') as f:
        pkl.dump(rt_df_dict, f)

    json_dicts = {}

    for d in rt_df_dict.keys():
        df = rt_df_dict[d]
        json_dicts[d] = json.loads(df.to_json())
        
    with open(os.path.join(EXPORT_DIR, 'rt_bangladesh.json'), 'w') as f:
        json.dump(json_dicts, f)


def fix_names():
    def name_fixing(filename):
        with open('district.json', 'r') as f:
            district_json = json.load(f)
            
        with open(filename, 'r') as f:
            rt_json = json.load(f)
            

        name_replacements = {
            # 'B. Baria': 'Brahamanbaria',
            'Bogra': 'Bogura',
            'Cox’s bazar': 'Cox\'s Bazar',
            'Dhaka City': 'Dhaka',
            # 'Dhaka (District)': 'Dhaka',
            'Jhalokathi': 'Jhalokati',
            'Moulvibazar': 'Maulvibazar',
            'Netrokona': 'Netrakona',
            'Potuakhali': 'Patuakhali',
            'total': 'Total'
        }

        for k in name_replacements.keys():
            if k in rt_json:
                rt_json[name_replacements[k]] = rt_json[k]
                del rt_json[k]
                
        rt_districts = list(rt_json.keys()) 
        districts = [district_json['features'][i]['properties']['name'] for i in range(64)] + ['Grand Total']
        if os.environ.get('COVID_DEPLOY') is None:
            districts += ['Dhaka (District)']

        districts.sort()
        rt_districts.sort()

        mapping = {}
        for i in range(len(districts)):
            if rt_districts[i] != districts[i]:
                logging.debug(f'{rt_districts[i]}: {districts[i]},')
            assert rt_districts[i] == districts[i], (rt_districts[i], districts[i])

        with open(filename, 'w') as f:
            json.dump(rt_json, f)

        
    for filename in ['rt_bangladesh.json', 'bd_case_history.json']:
        name_fixing(os.path.join(EXPORT_DIR, filename))


if __name__ == '__main__':
    logging.info('Preprocessing data...')
    preprocess_data()
    logging.info('Calculating R(t)...')
    calculate_rt()
    logging.info('Fixing the zone names...')
    fix_names()
