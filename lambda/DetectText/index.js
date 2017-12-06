const path = require('path');
const https = require('https');
const assert = require('assert');
const AWS = require('aws-sdk');
const {updateJobWithText} = require('../lib/store');

// event stucture:
// {
//   userId: 'fb_1234'
//   jobId: '1508046521851.4bqmb91j8sbynek',
//   files: [
//     {
//       bucketName: 'some-bucket-name',
//       key: 'fb_1234/gFGEFsYu',
//       url: 's3://$bucketName/$key',
//       type: 'image/jpeg'
//     }
//   ]
// }
const DetectText = exports.handler = (event, context, cb) => {

  const bucketName = process.env.BUCKET_NAME;
  const tableName = process.env.TABLE_NAME;
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const textToSpeechFnName = process.env.TEXT_TO_SPEECH_FN_NAME;
  const textToSpeechFnVersion = process.env.TEXT_TO_SPEECH_FN_VERSION || '$LATEST';

  getObjectAsBase64(bucketName, event.files[0].key)
    .then(base64data => {
      return detectImageText({content: base64data, googleApiKey});
    })
    .then(response => {
      console.log('Text detection response');

      const userId = event.userId;
      const jobId = event.jobId;
      const text = response.fullTextAnnotation ? response.fullTextAnnotation.text : null;

      console.log(text || 'no text detected');
      console.log('Updating job '+jobId);

      return updateJobWithText(process.env.TABLE_NAME, userId, jobId, text);
    })
    .then(({userId, jobId, text}) => {
      const params = {userId, jobId, text};
      return invokeTextToSpeech({textToSpeechFnName, textToSpeechFnVersion, params});
    })
    .then(({userId, jobId, text}) => {
      cb(null, {text});
    })
    .catch(error => {
      console.error(error);
      cb(error);
    });
}


// Make sure all required env vars are provided
const validateEnv = () => {
  assert(process.env.TABLE_NAME, 'TABLE_NAME is required');
  assert(process.env.GOOGLE_API_KEY, 'GOOGLE_API_KEY is required');
  assert(process.env.TEXT_TO_SPEECH_FN_NAME, 'TEXT_TO_SPEECH_FN_NAME is required');
  assert(process.env.BUCKET_NAME, 'BUCKET_NAME is required');
}


/**
* Get pre-signed url for object in S3. Seems not to work well with Cloud Vision API, so currently
* not used.
* @param {string} Bucket bucket the image is stored in
* @param {string} Key key of the object inside the bucket
*/
const getPresignedUrl = (Bucket, Key) => {
  const s3 = new AWS.S3();
  const params = {Bucket, Key};
  const operation = 'getObject';

  return new Promise((resolve, reject) => {
    s3.getSignedUrl(operation, params, (err, url) => {
      if (err) reject(err);
      else resolve(url);
    });
  });
}


/**
* Get object from S3 and return body as base64-encoded string.
* @param {string} Bucket
* @param {string} Key
*/
const getObjectAsBase64 = (Bucket, Key) => {
  const s3 = new AWS.S3();
  const params = {Bucket, Key};

  return new Promise((resolve, reject) => {
    s3.getObject(params, (err, data) => {
      if (err) reject(err);
      else {
        resolve(data.Body.toString('base64'));
      }
    });
  });
}

// Using our own simple http client to avoid heavy dependencies
// only json payloads are supported for request and response
// https is assumed, nothing else is supported
// returns a promise on the result.
const httpPost = (hostname, path, body) => {
  const data = JSON.stringify(body);
  const headers = {
    'Content-type': 'application/json',
    'Content-length': Buffer.byteLength(data)
  };
  const options = {
    method: 'POST',
    hostname,
    path,
    headers
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => {
        body += chunk
      });
      res.on('end', _ => {
        // console.log('RESPONSE BODY', body);
        resolve(JSON.parse(body));
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
* Pass given imageUri through cloud vision full text detection and return the first response.
* Requires GOOGLE_API_KEY as env var.
* @param {string} imageUri
*/
const detectImageText = (options) => {

  if (typeof options === 'string') {
    options = {imageUri: options};
  }

  const apiKey = options.googleApiKey;
  const host = 'vision.googleapis.com';
  const path = `/v1/images:annotate?key=${apiKey}`;

  let image;

  if (options.imageUri) {
    image = {
      source: {
        imageUri: options.imageUri
      }
    }
  } else if (options.content) {
    image = {
      content: options.content
    }
  } else {
    return Promise.reject(
      new Error('Invalid options: either imageUri or content must be provided')
    );
  }

  const payload = {
    requests: {
      image,
      features: [
        {
          type: 'DOCUMENT_TEXT_DETECTION'
        }
      ]
    }
  }

  return httpPost(host, path, payload).then(body => body.responses[0]);
}

const invokeTextToSpeech = (options) => {
  const {textToSpeechFnName, textToSpeechFnVersion, params} = options;

  console.log('Invoking '+textToSpeechFnName+':'+textToSpeechFnVersion);
  console.log('Params:', params);

  const lambda = new AWS.Lambda();
  const invocationParams = {
    FunctionName: textToSpeechFnName,
    Qualifier: textToSpeechFnVersion,
    InvocationType: 'Event',
    Payload: JSON.stringify(params)
  }

  return new Promise((resolve, reject) => {
    lambda.invoke(invocationParams, (err) => {
      if (err) reject(err);
      else resolve(params);
    });
  });
}
