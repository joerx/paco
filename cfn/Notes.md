# Cloudformation Stack

## TODO

MVP: Job creation and status query (disable text detection for now). Using local backend.

- ~~S3 bucket for uploads~~
- ~~Parameter for project name, used in tags~~
- ~~IAM policy for uploads~~
- ~~IAM role with WebIdentity for uploads~~
- ~~DynamoDB table for job storage~~
- ~~Managed IAM roles for logstream, dynamodb~~
- ~~Lambda for job registration~~
- ~~Lambda for job status update~~
- ~~API Gateway endpoints, lambda proxy, CORS policy~~

Complete the flow:

- ~~Lambda for text detection~~
- ~~IAM permissions for jobcreate invoke text detection~~
- Lambda for speech synthesis
- IAM permissions for textdetect invoke speech synth

Website hosting:

- S3 website hosting
- Template substitution (FB App ID) in static HTML/JS files

## CLI

- Set stack name for examples:

    ```sh
    export STACK_NAME=serverless-demo
    ```

- Create/update stack:

    ```sh
    aws cloudformation deploy --stack-name $STACK_NAME --template-file stack.json
    ```

- Specify parameter values, use `--parameter-overrides`
- Needed only when new params are introduced, later updates will use previous values

    ```sh
    # yikes!
    aws cloudformation deploy --stack-name $STACK_NAME --template-file stack.json --parameter-overrides ProjectName=ServerlessDemo
    ```

- Additional capabilities, needed to create IAM things, use `--capabilities` flag:

    ```sh
    aws cloudformation deploy --stack-name $STACK_NAME --template-file stack.json --capabilities CAPABILITY_IAM
    ```

- Package stack - uploads Lambda code to S3 and generates new template for deployment

    ```sh
    aws cloudformation package --template-file stack.json --s3-bucket serverless-demo-code --use-json > stack.deploy.json
    ```

- Delete stack:

    ```sh
    aws cloudformation delete-stack --stack-name $STACK_NAME
    ```

- Describe stack (also lists outputs):

    ```sh
    aws cloudformation describe-stacks --stack-name $STACK_NAME
    ```

- List stack resources:

    ```sh
    aws cloudformation list-stack-resources --stack-name $STACK_NAME
    ```

## Notes

### Naming Stuff

- Names for S3 bucket are randomly generated if not specified via `BucketName` property
- Roughly based on template, e.g. `serverless-demo-uploadbucket-1aqjgbnz9upp4`

### Intrinsic Functions

- Very limited list of function that can be used inside templates
- E.g. substitution: `"Fn::Sub": "/opt/aws/bin/cfn-init -v --stack ${AWS::StackName}`
- [Full list of functions](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html)

### Pseudo Parameters

- Predefined params, e.g. `AWS::AccountId`, `AWS::StackId`, etc.
- [Full list of pseudo parameters](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)
