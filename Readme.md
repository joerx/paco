# Serverless Application Demo

Upload an image containing text, have the text extracted and played back to you. Entirely serverless architecture, consiting mostly of Lambda, DynamoDB, 3rd party services and some glue code.

Technologies involved:

- AWS DynamoDB, Lambda, S3, API Gateway
- AWS CloudFormation
- Frontend: Vanilla HTML/JS/CSS
- Google Cloud Vision
- Amazon Polly

## Deployment

- Create a Facebook app, take note of app id
- Ensure you have the AWS CLI installed and configured
- Package then deploy the CloudFormation template:

    ```sh
    cd cf/
    FBAPPID=1234 PROJECT_NAME=my-demo GOOGLE_API_KEY=abc-123 make install
    ```

## Uninstall

- Delete the CloudFormation stack:

    ```sh
    cd cf/
    make remove
    ```

## Further Work

- Use event driven model with coordinator function, don't directly couple functions
