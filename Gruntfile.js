module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      core: {
	    files: [ 'components/octopus-editor/core/*.js' ],
        tasks: [ 'browserify', 'uglify:core' ]
      },
      blocks: {
	    files: [ 'components/octopus-editor/blocks/*.js' ],
        tasks: [ 'concat:blocks', 'uglify:blocks' ]
      },
      pythonocto: {
	    files: [ 'components/octopus-editor/generators/python-octo.js', 'components/octopus-editor/generators/python-octo/*.js' ],
        tasks: [ 'concat:pythonocto', 'uglify:pythonocto' ]
      }, 
    },
    browserify: {
      'components/octopus-editor/dist/blockly.js': [ 'components/octopus-editor/core/blockly.js' ]
    },
	  concat: {
      blocks: {
        src: [ 'components/octopus-editor/blocks/*.js' ],
        dest: 'components/octopus-editor/dist/blocks.js'
      },
      pythonocto: {
        src: [ 'components/octopus-editor/generators/python-octo.js', 'components/octopus-editor/generators/python-octo/*.js' ],
        dest: 'components/octopus-editor/dist/python-octo.js'
      }
	  },
	  uglify: {
      options: {
        // the banner is inserted at the top of the output
        banner: '/*! blockly <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      core: {
        files: {
          'components/octopus-editor/dist/blockly.min.js': ['components/octopus-editor/dist/blockly.js']
        }
      },
      blocks: {
        files: {
          'components/octopus-editor/dist/blocks.min.js': ['components/octopus-editor/dist/blocks.js']
        }
      },
      pythonocto: {
        files: {
          'components/octopus-editor/dist/python-octo.min.js': ['components/octopus-editor/dist/python-octo.js']
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
};
