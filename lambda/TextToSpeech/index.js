'use strict';

const AWS = require('aws-sdk');
const assert = require('assert');

const TextToSpeech = exports.handler = (event, context, cb) => {
    // Event structure
    // {
    //   userId: 1234,
    //   jobId: 124,
    //   text: "bla"
    // }
    console.log(event);

    assert(process.env.TABLE_NAME, 'TABLE_NAME is missing');
    assert(process.env.BUCKET_NAME, 'BUCKET_NAME is missing');

    const tableName = process.env.TABLE_NAME;
    const bucketName = process.env.BUCKET_NAME;
    const region = process.env.REGION || 'ap-northeast-1';
    
    const {text, jobId, userId} = event;

    synthesizeSpeech(text, region)
        .then(({data, type}) => {
            const key = userId+'/audio_'+jobId+'.mp3';
            return uploadToS3({key, type, data, bucketName})
        })
        .then(({bucketName, key, type}) => {
            const params = {tableName, bucketName, key, type, userId, jobId};
            return updateDynamoDB(params);
        })
        .then(info => {
            cb(null, info);
        })
        .catch(error => {
            console.error(error);
            cb(error);
        });
}


const uploadToS3 = ({bucketName, key, data, type}) => {
    const bucket = new AWS.S3({
        params: {
            Bucket: bucketName
        }
    });

    const params = {
        Key: key,
        ContentType: type,
        Body: data
    };

    return new Promise((resolve, reject) => {
        bucket.putObject(params, (err, response) => {
            if (err) reject(err);
            else {
                console.log('Upload successful');
                console.log(response);
                const url = 's3://'+bucketName+'/'+key;
                resolve({bucketName, key, url, type});
            }
        })
    });
}

const synthesizeSpeech = (text, region) => {
    const polly = new AWS.Polly({region});

    const params = {
        OutputFormat: 'mp3', 
        SampleRate: '8000',
        Text: text,
        TextType: 'text',
        VoiceId: 'Joanna'
    };

    return new Promise((resolve, reject) => {
        polly.synthesizeSpeech(params, function(err, data) {
            if (err) reject(err);
            else resolve({data: data.AudioStream, type: data.ContentType});
        });
    });
}


const updateDynamoDB = ({tableName, bucketName, key, type, userId, jobId}) => {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();

    const outputs = [{
        type,
        bucketName,
        key
    }];

    const params = {
        TableName: tableName,
        Key: {userId, jobId},
        UpdateExpression: 'set #outputs = :outputs, #status = :status',
        ExpressionAttributeNames: {
            '#outputs': 'outputs',
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':outputs': outputs, 
            ':status': 'SPEECH_GENERATED'
        }
    };

    return new Promise((resolve, reject) => {
        dynamoDB.update(params, (err, data) => {
            if (err) reject(err);
            else resolve({userId, jobId, bucketName, key});
        });
    });
}
