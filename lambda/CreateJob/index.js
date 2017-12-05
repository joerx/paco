'use strict';

const AWS = require('aws-sdk');
const uniqid = require('uniqid');
const assert = require('assert');
const mkResponse = require('../lib/mkresponse');

const tableName = process.env.TABLE_NAME;
const bucketName = process.env.BUCKET_NAME;
const detectorFnName = process.env.TEXT_DETECTION_FN_NAME;
const detectorFnVersion = process.env.TEXT_DETECTION_FN_VERSION || '$LATEST';
const jobStatusTopicName = process.env.TOPIC_ARN;

exports.handler = (request, context, cb) => {
  
  assert(bucketName, 'BUCKET_NAME is required');
  assert(tableName, 'TABLE_NAME is required');
  assert(jobStatusTopicName, 'TOPIC_ARN is required');
  assert(detectorFnName, 'TEXT_DETECTION_FN_NAME is required');

  let data = null;
  
  try {
    data = parseRequest(request);
  } catch(e) {
    cb(null, mkResponse(400, {error: e.message}));
    return;
  }
  
  const jobId = new Date().valueOf().toString()+'.'+uniqid();
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
  
  // store job in DynamoDB
  storeJob(jobData)
    .then(_ => publishJobStatus(jobId))
    .then(_ => invokeTextDetection(jobData))
    .then(_ => {
      const responseData = {message: 'Job accepted', jobId};
      cb(null, mkResponse(201, responseData));
    })
    .catch(e => {
      console.error('An error occured', e);
      cb(null, mkResponse(500, {error: e.message}));
    });
}

const storeJob = (jobData) => {
  console.log('Storing job', jobData);
 
  const dynamoDB = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: tableName,
    Item: jobData
  }
  
  return new Promise((resolve, reject) => {
    dynamoDB.put(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/**
* Invokes text detection function.
* @param {*object} event event data to pass to text detection
*/
const invokeTextDetection = (event) => {
  console.log('Invoking '+detectorFnName+':'+detectorFnVersion);
  
  const lambda = new AWS.Lambda();
  const params = {
    FunctionName: detectorFnName,
    Qualifier: detectorFnVersion,
    InvocationType: 'Event',
    Payload: JSON.stringify(event)
  }
  
  return new Promise((resolve, reject) => {
    lambda.invoke(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/**
* Publish job created event to SNS topic
* @param {*string} jobId 
*/
const publishJobStatus = (jobId) => {
  console.log('Publishing job status', jobId);

  const sns = new AWS.SNS();

  const message = {jobId};
  const params = {
    Message: JSON.stringify(message),
    TargetArn: jobStatusTopicName
  };
  
  return new Promise((resolve, reject) => {
    sns.publish(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

const parseRequest = (request) => {
  const data = JSON.parse(request.body);

  assert(data, 'No request body received');
  assert(data.key, 'Object key is missing');
  assert(data.type, 'Object type is missing');
  assert(data.userId, 'User id is missing');
  
  return data;
}
