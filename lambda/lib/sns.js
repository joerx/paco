const AWS = require('aws-sdk');

/**
 * Publish job created event to SNS topic
 * @param {*string} jobId 
 */
module.exports.publishJobStatus = (topicArn, jobId, status) => {
  console.log('Publishing job status', jobId);

  const sns = new AWS.SNS();

  const message = {jobId, status};
  const params = {
    Message: JSON.stringify(message),
    TargetArn: topicArn
  };
  
  return new Promise((resolve, reject) => {
    sns.publish(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
