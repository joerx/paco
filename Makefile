PROJECT_NAME ?= $(shell basename $$PWD)

version=$(shell date +%s)
# version=0.5.0-beta
stack_name=$(PROJECT_NAME)
code_bucket_name=$(aws_account_id)-$(stack_name)-kode
aws_account_id= $(shell aws sts get-caller-identity --output text --query 'Account')


cfn_params=\
	FbAppId=$(FBAPPID) \
	ProjectName=$(PROJECT_NAME) \
	ProjectVersion=$(version) \
	ProjectStage=dev \
	GoogleAPIKey=$(GOOGLE_API_KEY)

cfn_outputs=$(shell aws cloudformation describe-stacks --stack-name $(stack_name) | jq -r '.Stacks[0].Outputs[]|.OutputKey+"="+.OutputValue')

init: cfn-init
install: cfn-package cfn-deploy web-publish
destroy: cfn-destroy
show-events: cfn-events

help:
	@echo "Available Targets"
	@echo "init:     Init the AWS environment"
	@echo "install:  Deploy/update the CloudFormation stack, build and deploy static assets"
	@echo "destroy:  Destroy the CloudFormation stack and associated resources"

# TODO:
# - install node_modules for each lambda before cfn-package
# - build static website (sub-make?)
# - publish web assets into s3 bucket

debug:
	@echo "Project name: $(PROJECT_NAME)"
	@echo "Account id: $(aws_account_id)"
	@echo "Code bucket: $(code_bucket_name)"

checkenv:
	@test -n "$(PROJECT_NAME)" || (echo "Missing PROJECT_NAME"; exit 1)
	@test -n "$(GOOGLE_API_KEY)" || (echo "Missing GOOGLE_API_KEY"; exit 1)
	@test -n "$(FBAPPID)" || (echo "Missing FBAPPID"; exit 1)
	@which jq || (echo "jq is required"; exit 1)
	@which aws || (echo "aws cli is required"; exit 1)

cfn-init:
	aws s3 mb s3://$(code_bucket_name)

cfn-package: checkenv
	@which yarn || (echo "yarn is required"; exit 1)
	mkdir -p out/
	@for dir in `find lambda -mindepth 1 -maxdepth 1 -type d`;do yarn --cwd $$dir install; done
	aws cloudformation package \
		--template-file cfn/stack.json \
		--s3-bucket $(code_bucket_name) \
		--use-json \
		--output-template-file \
		out/stack.deploy.json

cfn-deploy: checkenv
	aws cloudformation deploy \
		--stack-name $(stack_name) \
		--template-file out/stack.deploy.json \
		--capabilities CAPABILITY_IAM \
		--parameter-overrides $(cfn_params)

cfn-destroy: checkenv
	aws cloudformation delete-stack --stack-name $(stack_name)

cfn-events: checkenv
	aws cloudformation describe-stack-events --stack-name $(stack_name)

cfn-outputs: checkenv
	@for out in $(cfn_outputs); do echo $$out; done

web-build: checkenv
	@$(MAKE) -C web/ $(cfn_outputs) build

web-publish: checkenv
	@$(MAKE) -C web/ $(cfn_outputs) publish

caddy: web-build
	@which caddy || (echo "caddy is required"; exit 1)
	caddy
