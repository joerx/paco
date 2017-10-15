#!/bin/sh

set -e

# import user creds if present
if [ -f ../.awscreds ]; then
    source ../.awscreds
    export AWS_ACCESS_KEY_ID
    export AWS_SECRET_ACCESS_KEY
    export AWS_DEFAULT_REGION
fi

FN_NAME=$(basename $1)
echo "Updating function $FN_NAME"

if [ ! -d $FN_NAME ]; then
    echo "Missing dir $FN_NAME"
    exit 1
fi

# create zip archive
cd $FN_NAME
rm -f export.zip
zip -9 -r export.zip ./* -x *.DS_Store* -x *.git*
cd -

# push latest version
aws lambda update-function-code \
    --function-name $FN_NAME \
    --zip-file fileb://$FN_NAME/export.zip \
    --no-publish

# set up environment
# aws lambda update-function-configuration \
#     --function-name $FN_NAME \
#     --environment Variables="{TABLE_NAME=PollinatorJobs}"

# # do not use $LATEST to avoid accidental overrides via lambda inline editor
# aws lambda update-alias \
#     --name edge \
#     --function-name TheGunterFn \
#     --function-version '$LATEST'