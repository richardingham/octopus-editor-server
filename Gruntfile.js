module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      core: {
	    files: [ 'resources/blockly/core/*.js' ],
        tasks: [ 'browserify', 'uglify:core' ]
      },
      blocks: {
	    files: [ 'resources/blockly/blocks/*.js' ],
        tasks: [ 'concat:blocks', 'uglify:blocks' ]
      },
      pythonocto: {
	    files: [ 'resources/blockly/generators/python-octo.js', 'resources/blockly/generators/python-octo/*.js' ],
        tasks: [ 'concat:pythonocto', 'uglify:pythonocto' ]
      },
    },
    browserify: {
      'resources/blockly/dist/blockly.js': [ 'resources/blockly/core/blockly.js' ]
    },
	  concat: {
      blocks: {
        src: [ 'resources/blockly/blocks/*.js' ],
        dest: 'resources/blockly/dist/blocks.js'
      },
      pythonocto: {
        src: [ 'resources/blockly/generators/python-octo.js', 'resources/blockly/generators/python-octo/*.js' ],
        dest: 'resources/blockly/dist/python-octo.js'
      }
	  },
	  uglify: {
      options: {
        // the banner is inserted at the top of the output
        banner: '/*! blockly <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      core: {
        files: {
          'resources/blockly/dist/blockly.min.js': ['resources/blockly/dist/blockly.js']
        }
      },
      blocks: {
        files: {
          'resources/blockly/dist/blocks.min.js': ['resources/blockly/dist/blocks.js']
        }
      },
      pythonocto: {
        files: {
          'resources/blockly/dist/python-octo.min.js': ['resources/blockly/dist/python-octo.js']
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
};
