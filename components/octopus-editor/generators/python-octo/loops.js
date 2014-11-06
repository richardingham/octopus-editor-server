/**
 * @license
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
 * https://github.com/google/Blockly.PythonOcto
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
 * @fileoverview Generating Python for loop blocks.
 * @author q.neutron@gmail.com (Quynh Neutron)
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';

Blockly.PythonOcto.LOOP_PASS = '[]';

Blockly.PythonOcto['controls_repeat'] = function(block) {
  // Repeat n times (internal number).
  var repeats = parseInt(block.getFieldValue('TIMES'), 10);
  var branch = Blockly.PythonOcto.statementToCode(block, 'DO');
  branch = Blockly.PythonOcto.addLoopTrap(branch, block.id) ||
      Blockly.PythonOcto.LOOP_PASS;
  var code = 'loop_while(False,\n' + Blockly.PythonOcto.prefixLines(branch + ',\nmin_calls = ' + repeats, Blockly.PythonOcto.INDENT) + '\n)';
  return code;
};

Blockly.PythonOcto['controls_repeat_ext'] = function(block) {
  // Repeat n times (external number).
  var repeats = Blockly.PythonOcto.valueToCode(block, 'TIMES',
      Blockly.PythonOcto.ORDER_NONE) || '0';
  //if (Blockly.PythonOcto.isNumber(repeats)) {
  //  repeats = parseInt(repeats, 10);
  //} else {
  //  repeats = 'int(' + repeats + ')';
  //}
  var branch = Blockly.PythonOcto.statementToCode(block, 'DO');
  branch = Blockly.PythonOcto.addLoopTrap(branch, block.id) ||
      Blockly.PythonOcto.LOOP_PASS;
  var code = 'loop_while(False,\n' + Blockly.PythonOcto.prefixLines(branch + ',\nmin_calls = ' + repeats, Blockly.PythonOcto.INDENT) + '\n)';
  return code;
};

Blockly.PythonOcto['controls_whileUntil'] = function(block) {
  // Do while/until loop.
  var until = block.getFieldValue('MODE') === 'UNTIL';
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'BOOL',
      Blockly.PythonOcto.ORDER_NONE) || (until ? 'True' : 'False');
  var branch = Blockly.PythonOcto.statementToCode(block, 'DO');
  branch = Blockly.PythonOcto.addLoopTrap(branch, block.id) ||
      Blockly.PythonOcto.LOOP_PASS;
  var code = (until ? 'loop_until(' : 'loop_while(') + argument0 + ',\n' + Blockly.PythonOcto.prefixLines(branch, Blockly.PythonOcto.INDENT) + '\n)';
  return code;
};

Blockly.PythonOcto['controls_for'] = function(block) {
  // For loop.
  var variable0 = Blockly.PythonOcto.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.PythonOcto.Variables.NAME_TYPE);
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'FROM',
      Blockly.PythonOcto.ORDER_NONE) || '0';
  var argument1 = Blockly.PythonOcto.valueToCode(block, 'TO',
      Blockly.PythonOcto.ORDER_NONE) || '0';
  var increment = Blockly.PythonOcto.valueToCode(block, 'BY',
      Blockly.PythonOcto.ORDER_NONE) || '1';
  var branch = Blockly.PythonOcto.statementToCode(block, 'DO');
  branch = Blockly.PythonOcto.addLoopTrap(branch, block.id) ||
      Blockly.PythonOcto.LOOP_PASS;

  var code = '';
  var range;

  // Helper functions.
  var defineUpRange = function() {
    return Blockly.PythonOcto.provideFunction_(
        'upRange',
        ['def ' + Blockly.PythonOcto.FUNCTION_NAME_PLACEHOLDER_ +
            '(start, stop, step):',
         '  while start <= stop:',
         '    yield start',
         '    start += abs(step)']);
  };
  var defineDownRange = function() {
    return Blockly.PythonOcto.provideFunction_(
        'downRange',
        ['def ' + Blockly.PythonOcto.FUNCTION_NAME_PLACEHOLDER_ +
            '(start, stop, step):',
         '  while start >= stop:',
         '    yield start',
         '    start -= abs(step)']);
  };
  // Arguments are legal Python code (numbers or strings returned by scrub()).
  var generateUpDownRange = function(start, end, inc) {
    return '(' + start + ' <= ' + end + ') and ' +
        defineUpRange() + '(' + start + ', ' + end + ', ' + inc + ') or ' +
        defineDownRange() + '(' + start + ', ' + end + ', ' + inc + ')';
  };

  if (Blockly.PythonOcto.isNumber(argument0) && Blockly.PythonOcto.isNumber(argument1) &&
      Blockly.PythonOcto.isNumber(increment)) {
    // All parameters are simple numbers.
    argument0 = parseFloat(argument0);
    argument1 = parseFloat(argument1);
    increment = Math.abs(parseFloat(increment));
    if (argument0 % 1 === 0 && argument1 % 1 === 0 && increment % 1 === 0) {
      // All parameters are integers.
      if (argument0 <= argument1) {
        // Count up.
        argument1++;
        if (argument0 == 0 && increment == 1) {
          // If starting index is 0, omit it.
          range = argument1;
        } else {
          range = argument0 + ', ' + argument1;
        }
        // If increment isn't 1, it must be explicit.
        if (increment != 1) {
          range += ', ' + increment;
        }
      } else {
        // Count down.
        argument1--;
        range = argument0 + ', ' + argument1 + ', -' + increment;
      }
      range = 'range(' + range + ')';
    } else {
      // At least one of the parameters is not an integer.
      if (argument0 < argument1) {
        range = defineUpRange();
      } else {
        range = defineDownRange();
      }
      range += '(' + argument0 + ', ' + argument1 + ', ' + increment + ')';
    }
  } else {
    // Cache non-trivial values to variables to prevent repeated look-ups.
    var scrub = function(arg, suffix) {
      if (Blockly.PythonOcto.isNumber(arg)) {
        // Simple number.
        arg = parseFloat(arg);
      } else if (arg.match(/^\w+$/)) {
        // Variable.
        arg = 'float(' + arg + ')';
      } else {
        // It's complicated.
        var varName = Blockly.PythonOcto.variableDB_.getDistinctName(
            variable0 + suffix, Blockly.PythonOcto.Variables.NAME_TYPE);
        code += varName + ' = float(' + arg + ')\n';
        arg = varName;
      }
      return arg;
    };
    var startVar = scrub(argument0, '_start');
    var endVar = scrub(argument1, '_end');
    var incVar = scrub(increment, '_inc');

    if (typeof startVar == 'number' && typeof endVar == 'number') {
      if (startVar < endVar) {
        range = defineUpRange(startVar, endVar, increment);
      } else {
        range = defineDownRange(startVar, endVar, increment);
      }
    } else {
      // We cannot determine direction statically.
      range = generateUpDownRange(startVar, endVar, increment);
    }
  }
  code += 'for ' + variable0 + ' in ' + range + ':\n' + branch;
  return code;
};

Blockly.PythonOcto['controls_forEach'] = function(block) {
  // For each loop.
  var variable0 = Blockly.PythonOcto.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.PythonOcto.Variables.NAME_TYPE);
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'LIST',
      Blockly.PythonOcto.ORDER_RELATIONAL) || '[]';
  var branch = Blockly.PythonOcto.statementToCode(block, 'DO');
  branch = Blockly.PythonOcto.addLoopTrap(branch, block.id) ||
      Blockly.PythonOcto.LOOP_PASS;
  var code = 'for ' + variable0 + ' in ' + argument0 + ':\n' + branch;
  return code;
};

Blockly.PythonOcto['controls_flow_statements'] = function(block) {
  // Flow statements: continue, break.
  switch (block.getFieldValue('FLOW')) {
    case 'BREAK':
      return 'break\n';
    case 'CONTINUE':
      return 'continue\n';
  }
  throw 'Unknown flow statement.';
};
