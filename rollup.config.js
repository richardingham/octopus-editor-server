import builtins from 'rollup-plugin-node-builtins';
import multiEntry from 'rollup-plugin-multi-entry';

export default [{
  // core input options
  input: {
    include: [
      'resources/blockly/core/blockly.js',
      'resources/blockly/blocks/*.js',
    ],
    exclude: [
      'resources/blockly/blocks/mixins.js',
      'resources/blockly/blocks/lists.js'
    ]
  },
  plugins: [
    builtins(), multiEntry()
  ],
  output: {
    file: 'resources/pack/blockly.js',
    format: 'iife',
    name: 'Blockly',
    globals: {
      tinycolor: 'tinycolor'
    }
  }
}, {
  input: {
    include: [
      'resources/blockly/generators/python-octo.js',
      'resources/blockly/generators/python-octo/*.js',
    ],
    exclude: [
    'resources/blockly/generators/python-octo/lists.js',
    ]
  },
  plugins: [
    multiEntry()
  ],
  output: {
    file: 'resources/pack/octopus-generator.js',
    format: 'iife',
    name: 'PythonOctoGenerator',
    globals: {
      Blockly: 'Blockly'
    }
  }
}];
