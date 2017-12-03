(function(exports) {
  
  exports.initApp = function(options) {
    
    if (!options.awsCredentials) {
      throw Error('Missing awsCredentials');
    }
    if (!options.userId) {
      throw Error('Missing userId');
    }
    
    options = Object.assign({}, options);
    
    var baseUrl = options.apiUrl;
    var createJobUrl = baseUrl+'/jobs';
    var getJobsUrl = baseUrl+'/jobs';
    
    var allowedTypes = {
      'image/png': 'png', 
      'image/jpeg': 'jpg'
    };
    
    var bucketName = options.bucketName;
    var region = options.region;
    
    var appContainer = document.querySelector('#app-container');
    var dropzone = appContainer.querySelector('#dropzone');
    var updateButton = appContainer.querySelector('#update-joblist');
    var autoUpdateBox = appContainer.querySelector('#joblist-auto-update');
    var jobListBody = appContainer.querySelector('#joblist-body');
    
    if (!appContainer) {
      throw Error('Missing #app-container');
    }
    if (!dropzone) {
      throw Error('Missing #dropzone');
    }
    
    function updateJobListWrapper(e) {
      if (e) e.preventDefault();
      updateButton.setAttribute('disabled', true);
      updateJobList(options.userId, jobListBody);
      updateButton.removeAttribute('disabled');
    }
    
    // init drop event handling
    initDropzone(dropzone, function(file) {
      createJob(file, options);
    });
    
    // update job list
    updateButton.addEventListener('click', updateJobListWrapper);
    updateJobListWrapper();
    
    // enable/disable automatic update of joblist
    var interval = null;
    autoUpdateBox.addEventListener('change', function(e) {
      if (e.target.checked) {
        console.log('enable auto update');
        interval = setInterval(updateJobListWrapper, 5000);
      }
      else {
        console.log('disable auto update');
        clearInterval(interval);
      }
    });
    
    appContainer.style.display = 'block';
    
    
    function createJob(file, options) {
      
      AWS.config.region = region;
      
      console.log(file);
      
      var suffix = allowedTypes[file.type];
      var key = options.userId+'/'+uniqid()+'.'+suffix;
      var bucket = new AWS.S3({
        params: {
          Bucket: bucketName
        },
        credentials: options.awsCredentials
      });
      
      var params = {
        Key: key,
        ContentType: file.type,
        Body: file
      };
      
      console.log('Uploading file to S3', params);
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
            key
          };
          console.log('Registering job');
          registerJob(jobParams);
        }
      });
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
        
        // ensure we really got an image here
        var file = e.dataTransfer.files[0];
        if (!allowedTypes[file.type]) {
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
      
      fetch(createJobUrl, fetchParams)
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
    
    
    function getJobs(userId) {
      var fetchParams = {
        method: 'GET',
        headers: {'Content-type': 'application/json'},
        mode: 'cors',
      };
      var url = getJobsUrl+'?userId='+encodeURIComponent(userId);
      
      return fetch(url, fetchParams)
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        return data.items;
      })
      .catch(function(error) {
        console.error('Failed getting job list', error);
      });
    }
    
    
    function updateJobList(userId, tbody) {
      getJobs(userId)
      .then(function(jobs) {
        tbody.innerHTML = jobs.map(function(job) {
          var hasText = false, outputLinks = '';

          console.log(job);
          
          if (typeof job.hasText == 'undefined' || job.hasText == null) {
            hasText = '';
          } else {
            hasText = job.hasText ? 'yes' : 'no';
          }
          if (typeof job.outputs != 'undefined' && job.outputs != null) {
            console.log('has outputs');
            outputLinks = job.outputs.map(function(o) {
              return '<audio src="'+o.url+'" controls="controls">'+
                '<a href="'+o.url+'">'+o.type+'</a></audio>';
            }).join('<br/>\n');
            console.log(outputLinks);
          }
          
          return '<tr>'+
          '<td>'+job.jobId+'</td>'+
          '<td>'+new Date(job.created).toLocaleString()+'</td>'+
          '<td>'+job.status+'</td>'+
          '<td class="boolean">'+hasText+'</td>'+
          '<td class="job-output">'+outputLinks+'</td>'+
          '</tr>\n';
        }).join('');
      });
    }
  }
  
  
  /**
  * Generate pseudo-random 7-character unique id used to name uploaded files.
  * Shamelessly copied from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
  */
  function uniqid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
    for (var i = 0; i < 20; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
    
    return text;
  }
  
})(window);
