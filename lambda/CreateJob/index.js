'use strict';

const AWS = require('aws-sdk');
const uniqid = require('uniqid');
const assert = require('assert');

const tableName = process.env.TABLE_NAME;
const bucketName = process.env.BUCKET_NAME;
const detectorFnName = process.env.TEXT_DETECTION_FN_NAME;
const detectorFnVersion = process.env.TEXT_DETECTION_FN_VERSION || '$LATEST';

exports.handler = (request, context, cb) => {

    assert(bucketName, 'BUCKET_NAME is required');
    assert(tableName, 'TABLE_NAME is required');
    // assert(detectorFnName, 'TEXT_DETECTION_FN_NAME is required');

    const [error, data] = parseRequest(request);
    if (error) {
        cb(null, mkResponse(400, {error}));
        return;
    }

    // store job in DynamoDB
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const jobId = new Date().valueOf().toString()+'.'+uniqid();

    console.log('Storing job', jobId);

    const jobData = {
        userId: data.userId,
        jobId: jobId,
        created: new Date().valueOf(),
        status: 'CREATED',
        files: [
            {
                key: data.key,
                type: data.type
            }
        ]
    }

    const params = {
        TableName: tableName,
        Item: jobData
    }

    dynamoDB.put(params, (err, data) => {
        if (err) {
            console.error('Error from DynamoDB', err);
            cb(null, mkResponse(500, err.message || err));
        }
        else invokeTextDetection(jobData, (err) => {
            if (err) cb(null, mkResponse(500, err.message || err));
            else {
                const responseData = {
                    message: 'Job accepted',
                    jobId: jobId
                };
                cb(null, mkResponse(201, responseData));
            }
        });
    });
}


const mkResponse = (statusCode, data) => {
  return {
      statusCode,
      body: JSON.stringify(data)+'\n',
      headers: {
          'Content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
      },
  }
}

const invokeTextDetection = (event, cb) => {
  cb(null);
  // console.log('Invoking lambda '+detectorFnName+':'+detectorFnVersion);

  // const lambda = new AWS.Lambda();
  // const params = {
  //     FunctionName: detectorFnName,
  //     Qualifier: detectorFnVersion,
  //     InvocationType: 'Event',
  //     Payload: JSON.stringify(event)
  // }

  // lambda.invoke(params, cb);
}

const parseRequest = (request) => {
  const data = JSON.parse(request.body);
  let err = null;

  if (!data) {
      err = 'No request body received';
  }
  else if (!data.key) {
      err = 'Object key is missing';
  }
  else if (!data.type) {
      err = 'Object type is missing';
  }
  else if (!data.userId) {
      err = 'User id is missing';
  }

  if (err) return [err, null];
  else return [null, data];
}