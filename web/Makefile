publish: build
	aws s3 sync dist/ s3://$(WebsiteBucket)/

build:
	mkdir -p dist
	cp -r assets dist/
	cp favicon.ico error.html dist/
	template="$$(cat index.html)"; eval "echo \"$${template}\" > dist/index.html"

clean:
	rm -rf dist/
