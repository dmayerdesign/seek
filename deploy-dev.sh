#!/bin/bash

cd ui && npm run build && cd ..
cd functions && sh build.sh && cd ..

npx firebase use seek-poe-dev
npx firebase deploy

