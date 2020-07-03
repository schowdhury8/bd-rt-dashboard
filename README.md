# bd-rt-dashboard
A dashboard to display the zoning and relevant predictions about different districts of Bangladesh.


## How to update, add new dates, and run it on your own server
1. In `source/rt_computation.py`, on line 17, change `DATA_URL` to the right CSV file (Right now we are using a Google spreadsheet's CSV export.)
2. Run `rt_computation.py`. The necessary requirements are `numpy, pandas, pickle, matplotlib`, and `scipy`.
3. This will generate two files, `bd_case_history.json` and `rt_bangladesh.json`. Host them somewhere online.
4. In `js/map.js`, line 16 and 18, change the `Rt_url` to point to the URL of `rt_bangladesh.json` file, and `caseHistoryUrl` to point to the URL of `bd_case_history.json` URL.
5. You're done!
