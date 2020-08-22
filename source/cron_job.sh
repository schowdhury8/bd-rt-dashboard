NOW=$(date +"%m-%d-%Y")

export COVID_DATA_DIRECTORY="/web/nms572/covid/$NOW"
export COVID_DEPLOY=1

pipenv run python rt_computation.py