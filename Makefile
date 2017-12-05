PROJECT_NAME ?= $(shell basename $$PWD)

version=$(shell date +%s)
stack_name=$(PROJECT_NAME)
sls=./node_modules/.bin/serverless
hbs=./node_modules/.bin/hbs

bucket=$(shell cat out/cfn.outputs.json | jq -r '.WebsiteBucket')

build: build-web
deploy: deploy-sls deploy-web
clean: clean-sls clean-web
update: clean deploy
update-web: clean-web deploy-web

help:
	@echo "Available Targets"
	@echo "build:        Rebuild static assets"
	@echo "deploy:       Deploy if not deployed already"
	@echo "update:       Clean outputs and deploy (forces rebuild)"
	@echo "update-web:   Clean, build and deploy web dist files"
	@echo "clean:        Delete all outputs and dist files"
	@echo "clean-web:    Delete web dist files"

debug:
	@echo "Project name: $(PROJECT_NAME)"
	@echo "Account id: $(aws_account_id)"
	@echo "Code bucket: $(code_bucket_name)"

checkenv:
	@# test -n "$(PROJECT_NAME)" || (echo "Missing PROJECT_NAME"; exit 1)
	@# test -n "$(GOOGLE_API_KEY)" || (echo "Missing GOOGLE_API_KEY"; exit 1)
	@test -n "$(FB_APP_ID)" || (echo "Missing FBAPPID"; exit 1)
	@which npm > /dev/null || (echo "npm is required"; exit 1)
	@which aws > /dev/null || (echo "aws cli is required"; exit 1)
	@which jq > /dev/null || (echo "jq is required"; exit 1)

node_modules:
	npm install

lambda/node_modules:
	cd lambda && npm install --production

deploy-sls: out/cfn.outputs.json

out/cfn.outputs.json: node_modules lambda/node_modules
	$(sls) deploy --stage=dev

build-web: web/dist

web/dist: node_modules
	mkdir -p web/dist
	cp -r web/assets web/dist/
	cp web/favicon.ico web/error.html web/dist/
	$(hbs) --data ./out/cfn.outputs.json ./web/index.html -o web/dist/

deploy-web: checkenv out/cfn.outputs.json web/dist
	aws s3 sync --delete web/dist/ s3://$(bucket)/

clean-sls:
	rm -rf .serverless
	rm -rf out/cfn.outputs.json

clean-web:
	rm -rf web/dist

# caddy: web-build
# 	@which caddy || (echo "caddy is required"; exit 1)
# 	caddy
