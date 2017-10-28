# version=$(shell date +%s)
version=0.5.0-beta
stack_name=$(PROJECT_NAME)
code_bucket_name=$(stack_name)-code
cfn_params=FacebookAppId=$(FBAPPID) \
	ProjectName=$(PROJECT_NAME) \
	ProjectVersion=$(version) \
	ProjectStage=dev \
	GoogleAPIKey=$(GOOGLE_API_KEY)

init: cfn-init
install: cfn-package cfn-deploy cfn-outputs
destroy: cfn-destroy
show-events: cfn-events

# TODO:
# - install node_modules for each lambda before cfn-package
# - build static website (sub-make?)
# - publish web assets into s3 bucket

cfn-init:
	aws s3 mb s3://$(code_bucket_name)

cfn-package:
	mkdir -p out/
	aws cloudformation package \
		--template-file cf/stack.json \
		--s3-bucket $(code_bucket_name) \
		--use-json \
		--output-template-file \
		out/stack.deploy.json

cfn-deploy:
	aws cloudformation deploy \
		--stack-name $(stack_name) \
		--template-file out/stack.deploy.json \
		--capabilities CAPABILITY_IAM \
		--parameter-overrides $(cfn_params)

cfn-destroy:
	aws cloudformation delete-stack --stack-name $(stack_name)

cfn-events:
	aws cloudformation describe-stack-events --stack-name $(stack_name)

cfn-outputs:
	aws cloudformation describe-stacks --stack-name $(stack_name) | jq '.Stacks[0].Outputs'
