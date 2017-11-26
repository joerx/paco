# Serverless Application Demo

Upload an image containing text, have the text extracted and played back to you. Entirely serverless architecture, consiting mostly of Lambda, DynamoDB, 3rd party services and some glue code.

Technologies involved:

- AWS DynamoDB, Lambda, S3, API Gateway
- AWS CloudFormation
- Frontend: Vanilla HTML/JS/CSS
- Google Cloud Vision
- Amazon Polly

## Preparation

- Ensure you have AWS configured to use the correct account region
- Ensure you have a log role for APIGateway set up, [see here][1]
- Run `make init` to create the S3 bucket to store Lambda code assets
- Create a Facebook app, take note of app id
- Create a Google app and API Key, take note of the key

## Deployment

- The below will package, then deploy the CloudFormation template and static web assets

    ```sh
    cd cf/
    make install FBAPPID=1234 PROJECT_NAME=my-demo GOOGLE_API_KEY=abc-123 
    ```

## Uninstall

- Delete the CloudFormation stack:

    ```sh
    cd cf/
    make remove
    ```

## Future Work

- See [Devlog](Devlog.md)

[1](https://kennbrodhagen.net/2016/07/23/how-to-enable-logging-for-api-gateway/)
