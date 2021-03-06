'use strict';

const AWS = require('aws-sdk');
const assert = require('assert');
const {mkResponse} = require('../lib/response');

const validateParams = (params) => {
  if (!params) {
    return [null, 'No params received'];
  }
  if (!params.userId) {
    return [null, 'Missing userId'];
  }
  return [params, null];
};

const getItemsFromDb = (tableName, userId) => {
  const dynamoDB = new AWS.DynamoDB.DocumentClient();
  
  const Limit = 10;
  const TableName = tableName;
  const KeyConditionExpression = 'userId = :userId';
  const ProjectionExpression = 'jobId,userId,created,#status,hasText,outputs';
  const ExpressionAttributeNames = {
    '#status': 'status'
  }
  const ExpressionAttributeValues = {
    ':userId': userId
  }
  
  const params = {
    TableName,
    KeyConditionExpression,
    ExpressionAttributeValues,
    ExpressionAttributeNames,
    ProjectionExpression,
    Limit
  };
  
  return new Promise((resolve, reject) => {
    dynamoDB.query(params, (err, res) => {
      if (err) reject(err);
      else resolve(res.Items);
    });
  });
};


const getSignedUrl = (bucketName, key) => {
  const s3 = new AWS.S3({region: 'ap-southeast-1'});
  const params = {Bucket: bucketName, Key: key};
  
  return new Promise((resolve, reject) => {
    s3.getSignedUrl('getObject', params, (err, url) => {
      if (err) reject(err);
      else {
        console.log('signed url:', url);
        resolve(url);
      }
    });
  });
}


const GetJobs = exports.handler = (req, context, cb) => {
  
  assert(process.env.TABLE_NAME, 'TABLE_NAME is required');
  assert(process.env.BUCKET_NAME, 'BUCKET_NAME is required');
  
  const tableName = process.env.TABLE_NAME;
  const bucketName = process.env.BUCKET_NAME;
  
  console.log('Getting records for user');
  console.log(req);
  
  const [data, error] = validateParams(req.queryStringParameters);
  if (error) {
    const response = mkResponse(400, {error});
    return cb(null, response);
  }
  
  const mapOutputs = (item) => {
    if (!item.outputs) {
      return Promise.resolve(item);
    }
    
    return Promise.all(
      // map outputs to signed object urls, return mapped outputs
      item.outputs.map(output => 
        getSignedUrl(bucketName, output.key)
          .then(url => {
            return {url, type: output.type}
          }))
    ).then(outputs => {
      // map transformed outputs with url back into item, return item
      return Object.assign({}, item, {outputs});
    });
  }
  
  getItemsFromDb(tableName, data.userId)
    .then(items => {
      return Promise.all(items.map(mapOutputs));
    })
    .then(items => {
      const response = mkResponse(200, {items: items});
      cb(null, response);
    })
    .catch(error => {
      console.error(error);
      cb(mkResponse(500, {error: error.message || error}));
    });
}
