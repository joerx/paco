# Polly Image Reader App

- Idea: use text recognition to extract text from uploaded files
- Then use polly to read the contents on the file
- Do this completely serverless using S3 and Lambda
- Write a terraform plan to roll out the application

## TODO

- Generate signed URL for upload per backend function (removes dependency on S3 SDK)
- Generate signed URLs for download per backend function
- Visual feedback for image upload in frontend
- Don't generate speech if no text was found in image
- Decouple functions, avoid direct invocations (using SNS?)
- ~~Use BUCKET_NAME as env var across the board~~

## Drag & Drop File Upload

- Make sure `ondragover` and `ondragenter` events are cancelled (`e.preventDefault`)

## Setup FB Login

- Using FB for now since it's easier to setup
- Consider swapping for Google later
- Pretty complex - lot of callbacks, code samples provided by FB don't make much sense

## Setup S3 Bucket and IAM

- Following https://aws.amazon.com/developers/getting-started/browser/
- Create bucket and setup CORS (basically allow all methods from everywhere)
- Create Role (must be FB only, can't use the same for Google)

Policy document:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": [
                "arn:aws:s3:::pollinator-uploads/facebook-${graph.facebook.com:id}/*"
            ],
            "Effect": "Allow"
        },
        {
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::pollinator-uploads"
            ],
            "Effect": "Allow",
            "Condition": {
                "StringEquals": {
                    "s3:prefix": "facebook-${graph.facebook.com:id}"
                }
            }
        }
    ]
}
```

Trust relationship:

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "graph.facebook.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "graph.facebook.com:app_id": "358770994578462"
        }
      }
    }
  ]
}
```

## Upload Stuff to S3

- The SDK will handle most of the grunt work for us, e.g. we don't need to meddle with STS
- Just pass the FB token as AWS.WebIdentityCredentials and the SDK will take care of the rest
- Check network tab during upload, see some calls to STS `AssumeRoleWithWebIdentity`
- The same call doesn't happen on subsequent uploads, so we assume it's cached

## Next Steps

- Was planning to use a Lambda triggered by the S3 upload to perform image processing 
- How can user track progress? 
- Maybe poll some API endpoint and use userId as identifier

TODO:

- Lambda to register uploads to DynamoDB, then do image processing
- Lambda endpoint returning all uploads and their status

## DynamoDB Considerations

AFrom the AWS docs: 

> We recommend that you choose a partition key that can have a large number of distinct values relative to the number of items in the table"

And:

> If the table has a composite primary key [...] it stores all of the items with the same partition key value physically close together, ordered by sort key value.

And: 

> You can read multiple items from the table in a single operation (Query), provided that the items you want have the same partition key value.

What do we want to do later:

- Retrieve all uploads of a single user, identified by user id
- In reverse order of upload time (newest first) within a certain range

Conclusion: can use userId as primary, jobId (timestamp+uniqid) as sort key

## Job API Lamdba + DynamoDB

- DynamoDB table 'PollinatorJobs'
- Lambda PollinatorJobAPI
- IAM role for lambda, attached policies: PollinatorDynamoDBAccess and LambdaLogstream
- Sample code: http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.01.html

## API Gateway

- Create API, POST method, point to lambda
- Creates some permissions (but I can't find a policy or role related to it?)
- Create deployment
- Need to create a model for the request body?
- Doesn't seem so, payload is mapped to lambda event directly
- Note: enable Lambda proxy for endpoint
- That way we can receice the full HTTP request and customize the HTTP response

### CORS

- Select API, Resources, Actions pulldown, Enable CORS
- Otherwise browser scripts won't be allowed to access the API
- Note: need to redeploy API and endpoint URL will change!
- Note: Access-Control-Allow-Origin must also be sent as header from the ACTUAL endpoint

## Image Recognition

- Seems AWS Rekogniton doesn't support text extraction
- Lets try something fance and integrate Google Vision API instead
- Try to use pre-signed URL to give Google API access to our image w/o making them public

## Cloud Vision API

- Create project, enable Cloud Vision API, created service role
- Can't find doc for what permissions needed on cloud vision, using Project Owner [sic] for now
- So far AWS IAM is way more powerful, Google IAM seems a lot of WIP right now
- Use Node SDK to enable text detection, pretty straight forward, then just extract the plain text

### Node SDK

- Sucks for Lambda: bloats bundle size to 22 MB (50 MB is max for Lambda)
- Doesn't work, some native extensions seem to be missing
- Let's try to use the REST API directly instead, we don't need any of the advanced stuff

### Lamdba

- Create role `PollinatorDetectText`, Policies `PollinatorDynamoDBAccess` and `LambdaLogstream`

### Lamdba Invoke Lambda

- Looks straight forward - use AWS SDK to call Lambda.invoke
- Permission required: `lambda:InvokeFunction`
- Policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1508053766000",
            "Effect": "Allow",
            "Action": [
                "lambda:InvokeAsync",
                "lambda:InvokeFunction"
            ],
            "Resource": [
                "arn:aws:lambda:ap-southeast-1:808510826174:function:PollinatorDetectText"
            ]
        }
    ]
}
```

### Pre-Signed URLs

- Pre-signed URLs inherit IAM permissions from the contect the creators was running with
- I.e. the same permissions as the IAM credentials that were used to generate the URL
- E.g. IAM role (Lambda, EC2), IAM creds passed to an app, AWS CLI, etc.
- Create new policy as below, attach to `PollinatorDetectText` role

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1508039776000",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::pollinator-uploads/*"
            ]
        }
    ]
}
```

### Alternatives

- Keeping it simple for now
- But direct coupling between Lambdas is cumbersome
- Most promising alternatives: Step Functions or SNS

Trigger DetectText as DynamoDB trigger:

- no direct coupling between lambdas, more event driven
- pretty messy having a lot of triggers all over the place

Step functions:

- seems like it's built pretty much for this
- not much experience yet, worthwile exploring

SQS:

- again, avoids tight coupling between lamdbas
- needs a polling lambda, cloudwatch, "empty" executions
- SQS is for buffering load, where's the point when Lamdba scales on demand?

SNS:

- SNS topics can act as middleware, avoid coupling
- Lambda can subscribe to SNS directly, no polling needed

## Job Status Tracking

- Simple Lambda API to return the 10 latest jobs and their status
- Use Polling from frontend to update job list (no WebSocket support yet)
- Problem: no authorization, userId just passed in querystring
- Same problem CreateJob endpoint

### Options for Authorization

1. Skip API Gateway, just invoke Lambda from Web UI using WebIdentity credentials
1. Other options? - TBD

## Speech Synthesis

- Another Lambda, called from the TextExtraction step directly
- Role: `PollinatorTextToSpeech`, policies for access to DynamoDB, S3 upload and Amazon Polly
- Additional permission in ExtractText to invoke TextToSpeech
- Polly n/a in ap-southeast-1, but can use different region as needed
