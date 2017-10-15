(function(exports) {

    var createJobUri = 'https://r50lrn6iv2.execute-api.ap-southeast-1.amazonaws.com/dev';

    var allowedTypes = ['image/png', 'image/jpeg'];
    var bucketName = 'pollinator-uploads';
    var region = 'ap-southeast-1';

    exports.initApp = function(options) {

        if (!options.awsCredentials) {
            throw Error('Missing awsCredentials');
        }
        if (!options.userId) {
            throw Error('Missing userId');
        }

        options = Object.assign({}, options);

        var appContainer = document.querySelector('#app-container');
        var dropzone = appContainer.querySelector('#dropzone');

        if (!appContainer) {
            throw Error('Missing #app-container');
        }
        if (!dropzone) {
            throw Error('Missing #dropzone');
        }

        initDropzone(dropzone, function(file) {

            AWS.config.region = region;

            var bucket = new AWS.S3({
                params: {
                    Bucket: bucketName
                },
                credentials: options.awsCredentials
            });

            var key = options.userId+'/'+uniqid();

            var params = {
                Key: key,
                ContentType: file.type,
                Body: file
            };

            console.log('Storing file to S3', params);

            bucket.putObject(params, function(err, data) {
                if (err) {
                    console.error('Upload to S3 failed', err);
                }
                else {
                    console.log(data);
                    console.log('Upload successful');
                    var jobParams = {
                        userId: options.userId,
                        type: file.type,
                        bucketName,
                        key
                    };
                    registerJob(jobParams);
                }
            });
        });

        appContainer.style.display = 'block';
    }

    /**
     * Set up event handlers for the dropzone element.
     */
    function initDropzone(dropzone, dropHandler) {

        dropzone.ondragenter = function(e) {
            e.preventDefault();
            dropzone.classList.add('dragover');
        }

        dropzone.ondragleave = function(e) {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        }

        dropzone.ondragover = function(e) {
            e.preventDefault();
        }

        dropzone.ondrop = function(e) {

            e.preventDefault();
            dropzone.classList.remove('dragover');

            var file = e.dataTransfer.files[0];

            // ensure we really got an image here
            if (allowedTypes.indexOf(file.type) < 0) {
                console.error('I can\'t let you do that dave!');
                return;
            }

            dropHandler(file);
        }
    }

    function registerJob(jobOptions) {
        console.log('Registering new job: ', jobOptions);

        var fetchParams = {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            mode: 'cors',
            body: JSON.stringify(jobOptions)
        };

        fetch(createJobUri, fetchParams)
            .then(function(response) {
                console.log('STATUS CODE '+response.status);
                return response.json();
            })
            .then(function(data) {
                console.log('RESPONSE DATA');
                console.log(data);
            })
            .catch(function(error) {
                console.error('Job registration failed', error);
            });
    }

    /**
     * Generate pseudo-random 7-character unique id used to name uploaded files.
     * Shamelessly copied from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
     */
    function uniqid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      
        for (var i = 0; i < 7; i++)
          text += possible.charAt(Math.floor(Math.random() * possible.length));
      
        return text;
    }

})(window);
