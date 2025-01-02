#!/bin/bash

cd ui && npm run build && cd ..
cd functions && sh build.sh && cd ..

npx firebase use seek-poe-dev && npx firebase deploy

# Required on first deploy (I think)
# gcloud functions add-iam-policy-binding getLesson \
#     --project='seek-poe-dev' \
#     --member='allUsers' \
#     --role='roles/cloudfunctions.invoker'
