MAKEFLAGS = --no-print-directory --always-make
MAKE = make $(MAKEFLAGS)

editor:
	cd editor; grunt; cd ../;

viewer:
	cd viewer; grunt; cd ../;

deploy-editor:
	/usr/local/bin/appcfg.py update .;
