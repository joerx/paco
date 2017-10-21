# Cloudformation Stack

## TODO

- ~~S3 bucket for uploads~~
- Parameters for project name, used as prefix (or use stack name)
- IAM policy for uploads
- IAM role with WebIdentity for uploads
- Lambda for job registration

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

    ```sh
    # yikes!
    aws cloudformation deploy --stack-name $STACK_NAME --template-file stack.json --parameter-overrides ProjectName=ServerlessDemo
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
