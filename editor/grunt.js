/*global module:false*/

module.exports = function(grunt) {

  var CSS_DIR   = 'src/css/';
  var JS_DIR    = 'src/js/';
  var BUILD_DIR = '';
  
  // Project configuration.
  grunt.initConfig({
    lint: {
      files: [JS_DIR + 'app/**/*.js']
    },
    less: {
      css: {
        src: [CSS_DIR + 'less/base.less'],
        dest: CSS_DIR + 'app/base.css',
      }
    },
    concat: {
      css: {
        src: [CSS_DIR + 'libs/*.css', CSS_DIR + 'app/*.css'],
        dest: BUILD_DIR + 'css/all.css'
      },
      js: {
        src: [JS_DIR + 'libs/zepto.js', JS_DIR + 'libs/zepto-mods.js',  JS_DIR + 'libs/zepto-data.js', JS_DIR + 'libs/bootstrap.js', JS_DIR + 'libs/closure-all.js', JS_DIR + 'app/*.js'],
        dest: BUILD_DIR + 'js/all.js'
      },
    },
    min: {
      js: {
        src: '<config:concat.js.dest>',
        dest: BUILD_DIR + 'js/all-min.js'
      }
    },
    cssmin: {
      css: {
        src: '<config:concat.css.dest>',
        dest: BUILD_DIR + 'css/all-min.css'
      }
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'lint'
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      },
      globals: {'goog': true}
    },
    uglify: {}
  });

  grunt.loadNpmTasks('/usr/local/lib/node_modules/grunt-less');
  grunt.loadNpmTasks('/usr/local/lib/node_modules/grunt-css');

  // Default task.
  grunt.registerTask('default', 'less concat min cssmin');

};
