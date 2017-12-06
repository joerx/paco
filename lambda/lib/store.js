const AWS = require('aws-sdk');

/**
 * Store extracted text in DynamoDB. Also change status to 'TEXT_EXTRACTED'
 * @param {string} userId userid the job belongs to, acts as partition key
 * @param {string} jobId job id to update, used as sort key
 * @param {string} text text to store for the job
 */
module.exports.updateJobWithText = (tableName, userId, jobId, text) => {
  const dynamoDB = new AWS.DynamoDB.DocumentClient();
  
  const expressions = [
    '#hasText=:hasText', 
    '#status=:status'
  ];
  const values = {
    ':hasText': text ? true : false,
    ':status': 'TEXT_EXTRACTED'
  }
  const names = {
    '#hasText': 'hasText',
    '#status': 'status'
  }
  
  if (text) {
    expressions.push('#text=:text');
    values[':text'] = text;
    names['#text'] = 'text';
  }
  
  const params = {
    TableName: tableName,
    Key: {userId, jobId},
    UpdateExpression: 'set '+expressions.join(','),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values
  }
  
  return new Promise((resolve, reject) => {
    dynamoDB.update(params, (err, data) => {
      if (err) reject(err);
      else resolve({userId, jobId, text});
    });
  });
}
