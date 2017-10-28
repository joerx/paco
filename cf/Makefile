version=$(shell date +%s)
stack_name=$(PROJECT_NAME)
cfn_params=FacebookAppId=$(FBAPPID) \
	ProjectName=$(PROJECT_NAME) \
	ProjectVersion=$(version) \
	ProjectStage=dev \
	GoogleAPIKey=$(GOOGLE_API_KEY)

install: cfn-package cfn-deploy cfn-outputs
destroy: cfn-destroy
show-events: cfn-events

cfn-package:
	aws cloudformation package \
		--template-file stack.json \
		--s3-bucket serverless-demo-code \
		--use-json \
		--output-template-file \
		stack.deploy.json

cfn-deploy:
	aws cloudformation deploy \
		--stack-name $(stack_name) \
		--template-file stack.deploy.json \
		--capabilities CAPABILITY_IAM \
		--parameter-overrides $(cfn_params)

cfn-destroy:
	aws cloudformation delete-stack --stack-name $(stack_name)

cfn-events:
	aws cloudformation describe-stack-events --stack-name $(stack_name)

cfn-outputs:
	aws cloudformation describe-stacks --stack-name $(stack_name) | jq '.Stacks[0].Outputs'
