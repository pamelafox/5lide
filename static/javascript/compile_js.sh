#!/bin/bash
#
# Copyright 2010 Google Inc.

# This script will re-generate the compiled Closure code.

# Download the closure compiler and library from
# http://closure-compiler.googlecode.com/
# Modify this script as required depending where you download them to.
# Update reqs.js according to what JS is currently needed.
 ~/www/closure-library/closure/bin/calcdeps.py -i reqs.js \
 -p  ~/www/closure-library/ -o compiled --compiler_jar \
 ~/closure-compiler/compiler.jar > closure-all.js
