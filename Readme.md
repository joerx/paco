# Serverless Application Demo

Upload an image containing text, have the text extracted and played back to you. Serverless architecture consisting mostly of Lambda, DynamoDB, 3rd party services and spaghetti code.

Technologies involved:

- [Serverless][2]
- DynamoDB, Lambda, S3, API Gateway
- CloudFormation
- VanillaJS Frontend (don't look at it)
- Google Cloud Vision
- Amazon Polly

## Preparation

- Ensure you have AWS configured to use the correct account region
- Create a hosted zone for the domain you want to use
- Ensure you have a log role for APIGateway set up, [see here][1]
- Create a Facebook app, take note of app id
- Create a Google app and API Key, take note of the key

## Configuration

- Set the following environment vars according to your project:

```sh
export PROJECT_NAME=$(basename $PWD)
export GOOGLE_API_KEY=<your api key>
export FB_APP_ID=<your app id>
export DOMAIN_NAME=<your domain>
```

## Deployment

- Using Makefile: `make clean deploy`
- This will run the serverless deployment and publish website assets
- For more info, see the [Makefile](./Makefile)

## Uninstall

- TODO

## Future Work

- Currently porting to [serverless][2]
- See [Devlog](Devlog.md)

[1](https://kennbrodhagen.net/2016/07/23/how-to-enable-logging-for-api-gateway/)
[2](https://serverless.com/)
