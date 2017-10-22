cfn_params=FacebookAppId=$(FBAPPID) ProjectName=$(PROJECT_NAME) GoogleAPIKey=$(GOOGLE_API_KEY)
stack_name=$(PROJECT_NAME)

install: package deploy

package:
	aws cloudformation package --template-file stack.json --s3-bucket serverless-demo-code --use-json --output-template-file stack.deploy.json

deploy:
	aws cloudformation deploy --stack-name $(stack_name) --template-file stack.deploy.json --capabilities CAPABILITY_IAM --parameter-overrides $(cfn_params)

destroy:
	aws cloudformation delete-stack --stack-name $(stack_name)
