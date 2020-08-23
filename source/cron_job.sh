NOW=$(date +"%m-%d-%Y")

export COVID_DATA_DIRECTORY="/web/nms572/covid/$NOW"
export COVID_DEPLOY=1

cd "/misc/vlgscratch5/FergusGroup/nms572/software/bd-rt-dashboard/source"
/home/nms572/.local/bin/pipenv run python rt_computation.py

cp -a "/web/nms572/covid/$NOW" "/web/nms572/covid/latest"
