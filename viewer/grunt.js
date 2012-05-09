/*global module:false*/

module.exports = function(grunt) {

  var CSS_DIR   = 'src/css/';
  var JS_DIR    = 'src/js/';
  var BUILD_DIR = '';

  // Project configuration.
  grunt.initConfig({
    concat: {
      css: {
        src: [CSS_DIR + 'app/*.css'],
        dest: BUILD_DIR + 'css/viewer.css'
      },=
    },
    cssmin: {
      css: {
        src: '<config:concat.css.dest>',
        dest: BUILD_DIR + 'css/viewer-min.css'
      }
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'lint'
    }
  });

  grunt.loadNpmTasks('/usr/local/lib/node_modules/grunt-css');

  // Default task.
  grunt.registerTask('default', 'concat cssmin');

};
