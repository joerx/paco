publish: build sync

package: build
	cd out/; rm -f web.zip; zip -9 -r web.zip ./* -x *.DS_Store* -x *.git*

sync:
	aws s3 sync out/ s3://$(WebsiteBucket)/

build:
	mkdir -p out
	cp -r assets out/
	cp favicon.ico error.html out/
	template="$$(cat index.html)"; eval "echo \"$${template}\" > out/index.html"

clean:
	rm -rf out/
