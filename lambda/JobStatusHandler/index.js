'use strict';

/*
{ 
  Records:
  [ 
    { 
      EventSource: 'aws:sns',
      EventVersion: '1.0',
      EventSubscriptionArn: 'arn:aws:sns:ap-southeast-1:468871832330:paco-dev-job-status:98cced42-4a2e-4afd-9c20-32670a4ba009',
      Sns: [Object] 
    } 
  ]
}
*/

/*
{"message": "test"}
*/

const JobStatusHandler = module.exports.handler = (event, context, cb) => {
  if (!event.Records) {
    console.error('Invalid event', event);
    return cb(new Error('Invalid event received'));
  }

  event.Records.forEach(record => {
    processSnsMessage(record.Sns);
  });
}

const processSnsMessage = (snsMessage) => {
  const payload = JSON.parse(snsMessage.Message);
  console.log(payload);
}
