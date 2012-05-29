/*global module:false*/

module.exports = function(grunt) {

  var SRC_CSS   = 'src/css/';
  var SRC_JS    = 'src/js/';
  var BUILD_CSS = 'css/';
  var BUILD_JS  = 'js/';
  
  grunt.initConfig({
    lint: {
      files: [SRC_JS + 'app/**/*.js']
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
      globals: {'Backbone': true,
                'Handlebars': true,
                '_': true,
                '$': true,
                'SL': true}
    },
    less: {
      css: {
        src: [SRC_CSS + 'less/base.less'],
        dest: SRC_CSS + 'app/base.css',
      }
    },
    concat: {
      css: {
        src: [SRC_CSS + 'libs/*.css',
              SRC_CSS + 'app/*.css'],
        dest: BUILD_CSS + 'css/all.css'
      },
      js: {
        src: [SRC_JS + 'libs/zepto.js',
              SRC_JS + 'libs/zepto-mods.js',
              SRC_JS + 'libs/zepto-data.js',
              SRC_JS + 'libs/bootstrap.js',
              SRC_JS + 'libs/underscore.js',
              SRC_JS + 'libs/backbone.js',
              SRC_JS + 'libs/handlebars.js',
              SRC_JS + 'libs/timeago.js',
              SRC_JS + 'app/models.js'],
        dest: BUILD_JS + 'js/all.js'
      },
    },
    jsmin: {
      js: {
        src: '<config:concat.js.dest>',
        dest: BUILD_JS + 'js/all-min.js'
      }
    },
    cssmin: {
      css: {
        src: '<config:concat.css.dest>',
        dest: BUILD_CSS + 'css/all-min.css'
      }
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'lint'
    }
  });

  grunt.loadNpmTasks('grunt-less');
  grunt.loadNpmTasks('grunt-css');

  // Default task.
  grunt.registerTask('default', 'lint less concat jsmin cssmin');

};
