const path = require('path');
const https = require('https');
const assert = require('assert');

const lamdbaHandler = exports.handler = (event, context, cb) => {

    // we only need AWS in lambda, so it's not in node_modules
    const AWS = require('aws-sdk');

    assert(process.env.TABLE_NAME, 'Missing TABLE_NAME in env');
    assert(process.env.GOOGLE_API_KEY, 'Missing GOOGLE_API_KEY in env');

    // event looks like this:
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

    // get pre-signed url to send to cloud vision
    const file = event.files[0];

    console.log('Getting pre-signed url for '+file.bucketName+'/'+file.key);
    getObjectAsBase64(file.bucketName, file.key)
        .then(base64data => {
            return detectImageText({content: base64data});
        })
        .then(response => {
            console.log('Text detection response');
            
            const userId = event.userId;
            const jobId = event.jobId;
            const text = response.fullTextAnnotation ? response.fullTextAnnotation.text : null;
            
            console.log(text || 'no text detected');
            console.log('Updating job '+jobId);

            return updateJobWithText(userId, jobId, text);
        })
        .then(text => {
            cb(null, {text});
        })
        .catch(error => {
            console.error(error);
            cb(error);
        });
}

const updateJobWithText = (userId, jobId, text) => {
    const AWS = require('aws-sdk');
    const dynamoDB = new AWS.DynamoDB.DocumentClient();

    let expression, values, names;

    if (text) {
        expression = 'set #text = :text, #hasText = :hasText';
        values = {':text': text, ':hasText': true};
        names = {'#text': 'text', '#hasText': 'hasText'};
    } else {
        expression = 'set #hasText = :hasText';
        values = {':hasText': false};
        names = {'#hasText': 'hasText'};
    }

    const params = {
        TableName: process.env.TABLE_NAME,
        Key: {userId, jobId},
        UpdateExpression: expression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
    }

    return new Promise((resolve, reject) => {
        dynamoDB.update(params, (err, data) => {
            if (err) reject(err);
            else {
                console.log('DynamoDB response data:');
                console.log(data);
                resolve(text);
            }
         });
    });
}

/**
 * Get pre-signed url for object in S3. Seems not to work well with Cloud Vision API, so currently
 * not used.
 * @param {string} Bucket bucket the image is stored in
 * @param {string} Key key of the object inside the bucket
 */
const getPresignedUrl = (Bucket, Key) => {
    const AWS = require('aws-sdk');
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
    const AWS = require('aws-sdk');
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
                console.log('RESPONSE BODY', body);
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
    assert(process.env.GOOGLE_API_KEY, 'Missing GOOGLE_API_KEY');

    if (typeof options === 'string') {
        options = {imageUri: options};
    }

    const host = 'vision.googleapis.com';
    const apiKey = process.env.GOOGLE_API_KEY;
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

    return httpPost(host, path, payload)
        .then((body) => body.responses[0]);
}

/**
 * Print usage for CLI mode
 */
const cliUsage = () => {
    console.log('node '+path.basename(process.argv[1])+' IMAGE_URI');
    process.exit(1);
}

/**
 * Handle error in CLI mode - print error to console.error and exit with non-zero exit code
 * @param {Error} err 
 */
const cliHandleError = (err) => {
    console.error(err);
    process.exit(1);
}

/**
 * Detect text on image given by URI, output the result.
 * @param {string} imageUri 
 */
const cliDetectImage = (imageUri) => {
    detectImageText(imageUri)
        .then(response => {
            if (!response.fullTextAnnotation) console.log('No text detected');
            else console.log(response.fullTextAnnotation.text);
        })
        .catch(cliHandleError);
}

// If called on CLI, just process the  given image
if (require.main === module) {
    const imageUri = process.argv[2];
    if (!imageUri) return cliUsage();
    else cliDetectImage(imageUri);
}
