'use strict';

const AWS = require('aws-sdk');

const mkResponse = (statusCode, body) => {
    return {
        statusCode,
        body: JSON.stringify(body)+'\n',
        headers: {
            'Content-type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
    }
}

const validateParams = (params) => {
    if (!params) {
        return [null, 'No params received'];
    }
    if (!params.userId) {
        return [null, 'Missing userId'];
    }
    return [params, null];
}

const GetJobs = exports.handler = (req, context, cb) => {

    if (!process.env.TABLE_NAME) {
        return cb(new Error('Missing table name'));
    }

    console.log('Getting records for user');
    console.log(req);

    const [data, error] = validateParams(req.queryStringParameters);
    if (error) {
        const response = mkResponse(400, {error});
        return cb(null, response);
    }

    const dynamoDB = new AWS.DynamoDB.DocumentClient();

    const Limit = 10;
    const TableName = process.env.TABLE_NAME;
    const KeyConditionExpression = 'userId = :userId';
    const ProjectionExpression = 'jobId,userId,created,#status';
    const ExpressionAttributeNames = {
        '#status': 'status'
    }
    const ExpressionAttributeValues = {
        ':userId': data.userId
    }

    const params = {
        TableName,
        KeyConditionExpression,
        ExpressionAttributeValues,
        ExpressionAttributeNames,
        ProjectionExpression,
        Limit
    };

    dynamoDB.query(params, (err, res) => {
        if (err) {
            console.error(err);
            return cb(mkResponse(500, {error: err.message}));
        }
        else {
            console.log('Query results:', res);
            const response = mkResponse(200, {items: res.Items});
            cb(null, response);
        }
    });
}
