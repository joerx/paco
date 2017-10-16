'use strict';

const AWS = require('aws-sdk');

const TextToSpeech = exports.handler = (event, context, cb) => {
    // Event structure
    // {
    //   userId: 1234,
    //   jobId: 124,
    //   text: "bla"
    // }
    console.log(event);
    
    const {text, jobId, userId} = event;

    synthesizeSpeech(text)
        .then(({data, type}) => {
            const key = userId+'/audio_'+jobId+'.mp3';
            return uploadToS3({key, type, data})
        })
        .then(s3Info => {
            cb(null, s3Info);
        })
        .catch(error => {
            console.error(error);
            cb(error);
        });
}


const uploadToS3 = ({key, data, type}) => {
    // FIXME: get from request (or pass as env across all functions)
    const bucketName = 'pollinator-uploads';
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
                resolve({bucketName, key, url});
            }
        })
    });
}

const synthesizeSpeech = (text) => {
    const region = process.env.REGION || 'ap-northeast-1';
    const polly = new AWS.Polly({region});

    const params = {
        OutputFormat: 'mp3', 
        SampleRate: '8000',
        Text: text,
        TextType: 'text',
        VoiceId: 'Joanna'
    }

    return new Promise((resolve, reject) => {
        polly.synthesizeSpeech(params, function(err, data) {
            if (err) reject(err);
            else resolve({data: data.AudioStream, type: data.ContentType});
        });
    });
}
