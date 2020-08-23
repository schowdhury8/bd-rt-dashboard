# bd-rt-dashboard
A dashboard to display the zoning and relevant predictions about different districts of Bangladesh.


## How to install dependencies and run it on your own server
```sh
# clone in git
git clone git@github.com:notmahi/bd-rt-dashboard.git
cd bd-rt-dashboard

# If you're looking to deploy, switch to the right branch
git checkout deploy

# set up the environment variables necessary to run this code
export COVID_DATA_DIRECTORY="/directory/where/the/output/will/be"
export COVID_DEPLOY=1

# install all the dependencies
cd source
pipenv sync
# Run the code
pipenv run python rt_computation.py

# (Optional) check the logs for a successful execution
cat deploy_logs.log | tail
```

## Output format

In `rt_bangladesh.json`, you will find a JSON dictionary like the following:
```json
{
   "Bagerhat":{
      "index":{...},
      "date":{...},
      "ML":{...},
      "Low_90":{...},
      "High_90":{...},
      "Low_50":{...},
      "High_50":{...},
      "enough_data":{...},
      "growth_rate_ML":{...},
      "doubling_time_ML":{...},
      "growth_rate_Low_50":{...},
      "doubling_time_Low_50":{...},
      "growth_rate_High_50":{...},
      "doubling_time_High_50":{...},
      "growth_rate_Low_90":{...},
      "doubling_time_Low_90":{...}
   },
   "Bandarban":{...},
   "Barguna":{...},
   "Barisal":{...},
   "Bhola":{...},
   "Brahamanbaria":{...},
   ...
}
```

Each of `index`, `ML`, `Low_90`, and such are lists.

* `date`: Basically, the timestamp to which each index corresponds to.
* `enough_data`: Whether we had enough data to be confident about our prediction on that day. It is false if the confidence interval is too wide.
* **R(t) Values**:
    * `ML` : Mean or maximum likelihood value of R(t).
    * `Low_90`/`High_90`: lower and upper bounds of the 90% confidence interval.
    * `Low_50`/`High_50`: lower and upper bounds of the 50% confidence interval.
* **Growth rate values**: Same columns as R(t) values, except with `growth_rate_` attached to the column names (so `growth_rate_ML`, `growth_rate_High_90` and so on).
* **Doubling time values**: Same columns as R(t) values, except with `doubling_time_` attached to the column names  (so `doubling_time_ML`, `doubling_time_High_90` and so on).

## Instructions for using the frontend

1. In `source/rt_computation.py`, on line 17, change `DATA_URL` to the right CSV file (Right now we are using a Google spreadsheet's CSV export.)
2. Run `rt_computation.py`. The necessary requirements are `numpy, pandas, pickle, matplotlib`, and `scipy`.
3. This will generate two files, `bd_case_history.json` and `rt_bangladesh.json`. Host them somewhere online.
4. In `js/map.js`, line 16 and 18, change the `Rt_url` to point to the URL of `rt_bangladesh.json` file, and `caseHistoryUrl` to point to the URL of `bd_case_history.json` URL.
5. You're done!
