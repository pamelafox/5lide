#!/bin/bash
#
# Copyright 2010 Google Inc.

# Download the closure compiler from
# http://closure-compiler.googlecode.com/files/compiler-latest.zip
# Extract to this directory, and run this shell script.
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS \
--js debug/browser.js --js debug/dialog.js --js debug/dom.js \
--js debug/drag.js --js debug/event.js --js debug/io.js \
--js debug/lang.js --js debug/offscreen.js --js debug/slideset.js \
--externs debug/externs_slides.js --js_output_file slides.js
