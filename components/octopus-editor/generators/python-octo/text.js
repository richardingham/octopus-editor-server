/**
 * @license
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
 * https://github.com/google/blockly
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating Python for text blocks.
 * @author q.neutron@gmail.com (Quynh Neutron)
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';

Blockly.PythonOcto['text'] = function(block) {
  // Text value.
  var code = Blockly.PythonOcto.quote_(block.getFieldValue('TEXT'));
  return [code, Blockly.PythonOcto.ORDER_ATOMIC];
};

Blockly.PythonOcto['text_join'] = function(block) {
  // Create a string made up of any number of elements of any type.
  //Should we allow joining by '-' or ',' or any other characters?
  var code;
  if (block.itemCount_ == 0) {
    return ['\'\'', Blockly.PythonOcto.ORDER_ATOMIC];
  } else if (block.itemCount_ == 1) {
    var argument0 = Blockly.PythonOcto.valueToCode(block, 'ADD0',
        Blockly.PythonOcto.ORDER_NONE) || '\'\'';
    code = 'str(' + argument0 + ')';
    return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
  } else if (block.itemCount_ == 2) {
    var argument0 = Blockly.PythonOcto.valueToCode(block, 'ADD0',
        Blockly.PythonOcto.ORDER_NONE) || '\'\'';
    var argument1 = Blockly.PythonOcto.valueToCode(block, 'ADD1',
        Blockly.PythonOcto.ORDER_NONE) || '\'\'';
    var code = 'str(' + argument0 + ') + str(' + argument1 + ')';
    return [code, Blockly.PythonOcto.ORDER_UNARY_SIGN];
  } else {
    var code = [];
    for (var n = 0; n < block.itemCount_; n++) {
      code[n] = Blockly.PythonOcto.valueToCode(block, 'ADD' + n,
          Blockly.PythonOcto.ORDER_NONE) || '\'\'';
    }
    var tempVar = Blockly.PythonOcto.variableDB_.getDistinctName('temp_value',
        Blockly.Variables.NAME_TYPE);
    code = '\'\'.join([str(' + tempVar + ') for ' + tempVar + ' in [' +
        code.join(', ') + ']])';
    return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
  }
};

Blockly.PythonOcto['text_append'] = function(block) {
  // Append to a variable in place.
  var varName = Blockly.PythonOcto.variableDB_.getName(block.getFieldValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'TEXT',
      Blockly.PythonOcto.ORDER_NONE) || '\'\'';
  return varName + ' = str(' + varName + ') + str(' + argument0 + ')\n';
};

Blockly.PythonOcto['text_length'] = function(block) {
  // String length.
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'VALUE',
      Blockly.PythonOcto.ORDER_NONE) || '\'\'';
  return ['len(' + argument0 + ')', Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['text_isEmpty'] = function(block) {
  // Is the string null?
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'VALUE',
      Blockly.PythonOcto.ORDER_NONE) || '\'\'';
  var code = 'not len(' + argument0 + ')';
  return [code, Blockly.PythonOcto.ORDER_LOGICAL_NOT];
};

Blockly.PythonOcto['text_indexOf'] = function(block) {
  // Search the text for a substring.
  // Should we allow for non-case sensitive???
  var operator = block.getFieldValue('END') == 'FIRST' ? 'find' : 'rfind';
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'FIND',
      Blockly.PythonOcto.ORDER_NONE) || '\'\'';
  var argument1 = Blockly.PythonOcto.valueToCode(block, 'VALUE',
      Blockly.PythonOcto.ORDER_MEMBER) || '\'\'';
  var code = argument1 + '.' + operator + '(' + argument0 + ') + 1';
  return [code, Blockly.PythonOcto.ORDER_MEMBER];
};

Blockly.PythonOcto['text_charAt'] = function(block) {
  // Get letter at index.
  // Note: Until January 2013 this block did not have the WHERE input.
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var at = Blockly.PythonOcto.valueToCode(block, 'AT',
      Blockly.PythonOcto.ORDER_UNARY_SIGN) || '1';
  var text = Blockly.PythonOcto.valueToCode(block, 'VALUE',
      Blockly.PythonOcto.ORDER_MEMBER) || '\'\'';
  switch (where) {
    case 'FIRST':
      var code = text + '[0]';
      return [code, Blockly.PythonOcto.ORDER_MEMBER];
    case 'LAST':
      var code = text + '[-1]';
      return [code, Blockly.PythonOcto.ORDER_MEMBER];
    case 'FROM_START':
      // Blockly uses one-based indicies.
      if (Blockly.isNumber(at)) {
        // If the index is a naked number, decrement it right now.
        at = parseInt(at, 10) - 1;
      } else {
        // If the index is dynamic, decrement it in code.
        at = 'int(' + at + ' - 1)';
      }
      var code = text + '[' + at + ']';
      return [code, Blockly.PythonOcto.ORDER_MEMBER];
    case 'FROM_END':
      var code = text + '[-' + at + ']';
      return [code, Blockly.PythonOcto.ORDER_MEMBER];
    case 'RANDOM':
      Blockly.PythonOcto.definitions_['import_random'] = 'import random';
      var functionName = Blockly.PythonOcto.provideFunction_(
          'text_random_letter',
          ['def ' + Blockly.PythonOcto.FUNCTION_NAME_PLACEHOLDER_ + '(text):',
           '  x = int(random.random() * len(text))',
           '  return text[x];']);
      code = functionName + '(' + text + ')';
      return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
  }
  throw 'Unhandled option (text_charAt).';
};

Blockly.PythonOcto['text_getSubstring'] = function(block) {
  // Get substring.
  var text = Blockly.PythonOcto.valueToCode(block, 'STRING',
      Blockly.PythonOcto.ORDER_MEMBER) || '\'\'';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  var at1 = Blockly.PythonOcto.valueToCode(block, 'AT1',
      Blockly.PythonOcto.ORDER_ADDITIVE) || '1';
  var at2 = Blockly.PythonOcto.valueToCode(block, 'AT2',
      Blockly.PythonOcto.ORDER_ADDITIVE) || '1';
  if (where1 == 'FIRST' || (where1 == 'FROM_START' && at1 == '1')) {
    at1 = '';
  } else if (where1 == 'FROM_START') {
    // Blockly uses one-based indicies.
    if (Blockly.isNumber(at1)) {
      // If the index is a naked number, decrement it right now.
      at1 = parseInt(at1, 10) - 1;
    } else {
      // If the index is dynamic, decrement it in code.
      at1 = 'int(' + at1 + ' - 1)';
    }
  } else if (where1 == 'FROM_END') {
    if (Blockly.isNumber(at1)) {
      at1 = -parseInt(at1, 10);
    } else {
      at1 = '-int(' + at1 + ')';
    }
  }
  if (where2 == 'LAST' || (where2 == 'FROM_END' && at2 == '1')) {
    at2 = '';
  } else if (where1 == 'FROM_START') {
    if (Blockly.isNumber(at2)) {
      at2 = parseInt(at2, 10);
    } else {
      at2 = 'int(' + at2 + ')';
    }
  } else if (where1 == 'FROM_END') {
    if (Blockly.isNumber(at2)) {
      // If the index is a naked number, increment it right now.
      at2 = 1 - parseInt(at2, 10);
      if (at2 == 0) {
        at2 = '';
      }
    } else {
      // If the index is dynamic, increment it in code.
      // Add special case for -0.
      Blockly.PythonOcto.definitions_['import_sys'] = 'import sys';
      at2 = 'int(1 - ' + at2 + ') or sys.maxsize';
    }
  }
  var code = text + '[' + at1 + ' : ' + at2 + ']';
  return [code, Blockly.PythonOcto.ORDER_MEMBER];
};

Blockly.PythonOcto['text_changeCase'] = function(block) {
  // Change capitalization.
  var OPERATORS = {
    'UPPERCASE': '.upper()',
    'LOWERCASE': '.lower()',
    'TITLECASE': '.title()'
  };
  var operator = OPERATORS[block.getFieldValue('CASE')];
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'TEXT',
      Blockly.PythonOcto.ORDER_MEMBER) || '\'\'';
  var code = argument0 + operator;
  return [code, Blockly.PythonOcto.ORDER_MEMBER];
};

Blockly.PythonOcto['text_trim'] = function(block) {
  // Trim spaces.
  var OPERATORS = {
    'LEFT': '.lstrip()',
    'RIGHT': '.rstrip()',
    'BOTH': '.strip()'
  };
  var operator = OPERATORS[block.getFieldValue('MODE')];
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'TEXT',
      Blockly.PythonOcto.ORDER_MEMBER) || '\'\'';
  var code = argument0 + operator;
  return [code, Blockly.PythonOcto.ORDER_MEMBER];
};

Blockly.PythonOcto['controls_log'] = function(block) {
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'TEXT',
      Blockly.PythonOcto.ORDER_NONE) || '\'\'';
  return 'log(' + argument0 + ')';
};
