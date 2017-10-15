'use strict';

const AWS = require('aws-sdk');
const uniqid = require('uniqid');
const assert = require('assert');

const tableName = process.env.TABLE_NAME;
const detectorFnName = process.env.TEXT_DETECTION_FN_NAME;
const detectorFnVersion = process.env.TEXT_DETECTION_FN_VERSION || '$LATEST';

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
    console.log('Invoking lambda '+detectorFnName+':'+detectorFnVersion);

    const lambda = new AWS.Lambda();
    const params = {
        FunctionName: detectorFnName,
        Qualifier: detectorFnVersion,
        InvocationType: 'Event',
        Payload: JSON.stringify(event)
    }

    lambda.invoke(params, cb);
}

const doLambda = (request, cb) => {

    assert(tableName, 'Missing TABLE_NAME in env');
    assert(detectorFnName, 'Missing TEXT_DETECTION_FN_NAME in env');

    console.log('Raw request:', request.body);

    const data = JSON.parse(request.body);

    console.log('Parsed request:', data);

    // validate request
    let error = null;

    if (!data.bucketName) {
        error = 'bucketName is missing';
    }
    if (!data.key) {
        error = 'key is missing';
    }
    if (!data.type) {
        error = 'type is missing';
    }
    if (!data.userId) {
        error = 'userId is missing';
    }
    if (error) {
        console.warn('Request validation error', error);
        const response = mkResponse(400, {error});
        return cb(null, response);
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
                bucketName: data.bucketName,
                key: data.key,
                url: 's3://'+data.bucketName+'/'+data.key,
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
        else {
            invokeTextDetection(jobData, (err) => {
                if (err) {
                    console.error('Error invoking text detection', err);
                    cb(null, mkResponse(500, err.message || err));
                } else {
                    const responseData = {
                        message: 'Job accepted',
                        jobId: jobId
                    };
                    console.log('All good');
                    cb(null, mkResponse(201, responseData));
                }
            });
        }
    });
}

// Lambda handler
exports.handler = (request, context, cb) => {
    try {
        doLambda(request, cb);
    } catch(error) {
        console.error(error);
        cb(null, mkResponse(500, {error: error.message}));
    }
}
