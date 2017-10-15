'use strict';

const AWS = require('aws-sdk');
const uniqid = require('uniqid');

const tableName = process.env.TABLE_NAME;

const mkResponse = function(statusCode, body) {
    if (typeof arguments[0] === 'object') {
        statusCode = 200;
        body = arguments[0];
    }
    return {
        statusCode: statusCode,
        headers: {
            'Content-type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(body)+'\n'
    }
}

// Lambda handler
exports.handler = function(request, context, cb) {

    if (!tableName) {
        return cb(Error('Missing table name'));
    }

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
        const response = mkResponse(400, {message: error});
        return cb(null, response);
    }

    // store job in DynamoDB
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const jobId = new Date().valueOf().toString()+'.'+uniqid();

    console.log('Storing job', jobId);

    const params = {
        TableName: tableName,
        Item: {
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
    }

    dynamoDB.put(params, (err, data) => {
        if (err) {
            console.error('Error from DynamoDB', err);
            cb(null, mkResponse(500, err.message || err));
        }
        else {
            const responseData = {
                message: 'Job accepted',
                jobId: jobId
            };
            console.log('All good');
            cb(null, mkResponse(201, responseData));
        }
    });
}
