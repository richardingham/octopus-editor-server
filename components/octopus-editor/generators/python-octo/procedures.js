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
 * @fileoverview Generating Python for procedure blocks.
 * @author fraser@google.com (Neil Fraser)
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';


Blockly.PythonOcto['procedures_defreturn'] = function(block) {
  /*/ Define a procedure with a return value.
  // First, add a 'global' statement for every variable that is assigned.
  var globals = Blockly.Variables.allVariables(block);
  for (var i = globals.length - 1; i >= 0; i--) {
    var varName = globals[i];
    if (block.arguments_.indexOf(varName) == -1) {
      globals[i] = Blockly.PythonOcto.variableDB_.getName(varName,
          Blockly.Variables.NAME_TYPE);
    } else {
      // This variable is actually a parameter name.  Do not include it in
      // the list of globals, thus allowing it be of local scope.
      globals.splice(i, 1);
    }
  }
  globals = globals.length ? '  global ' + globals.join(', ') + '\n' : '';*/
  var funcName = Blockly.PythonOcto.variableDB_.getName(block.getFieldValue('NAME'),
      Blockly.Procedures.NAME_TYPE);
  var branch = Blockly.PythonOcto.statementToCode(block, 'STACK');
  if (Blockly.PythonOcto.STATEMENT_PREFIX) {
    branch = Blockly.PythonOcto.prefixLines(
        Blockly.PythonOcto.STATEMENT_PREFIX.replace(/%1/g,
        '\'' + block.id + '\''), Blockly.PythonOcto.INDENT) + branch;
  }
  if (Blockly.PythonOcto.INFINITE_LOOP_TRAP) {
    branch = Blockly.PythonOcto.INFINITE_LOOP_TRAP.replace(/%1/g,
        '"' + block.id + '"') + branch;
  }
  var returnValue = Blockly.PythonOcto.valueToCode(block, 'RETURN',
      Blockly.PythonOcto.ORDER_NONE) || '';
  if (returnValue) {
    returnValue = 'return ' + returnValue + '\n';
  } else if (!branch) {
    branch = 'pass';
  }
  var args = [];
  for (var x = 0; x < block.arguments_.length; x++) {
    args[x] = Blockly.PythonOcto.variableDB_.getName(block.arguments_[x],
        Blockly.Variables.NAME_TYPE);
  }
  var code = 'def ' + funcName + '(' + args.join(', ') + '):\n' +
      Blockly.PythonOcto.prefixLines(branch + returnValue, Blockly.PythonOcto.INDENT);
  code = Blockly.PythonOcto.scrub_(block, code);
  Blockly.PythonOcto.definitions_[funcName] = code;
  return null;
};


// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
Blockly.PythonOcto['procedures_defnoreturn'] =
    Blockly.PythonOcto['procedures_defreturn'];

Blockly.PythonOcto['procedures_callreturn'] = function(block) {
  // Call a procedure with a return value.
  var funcName = Blockly.PythonOcto.variableDB_.getName(block.getFieldValue('NAME'),
      Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var x = 0; x < block.arguments_.length; x++) {
    args[x] = Blockly.PythonOcto.valueToCode(block, 'ARG' + x,
        Blockly.PythonOcto.ORDER_NONE) || 'None';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['procedures_callnoreturn'] = function(block) {
  // Call a procedure with no return value.
  var funcName = Blockly.PythonOcto.variableDB_.getName(block.getFieldValue('NAME'),
      Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var x = 0; x < block.arguments_.length; x++) {
    args[x] = Blockly.PythonOcto.valueToCode(block, 'ARG' + x,
        Blockly.PythonOcto.ORDER_NONE) || 'None';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return code;
};

Blockly.PythonOcto['procedures_ifreturn'] = function(block) {
  // Conditionally return value from a procedure.
  var condition = Blockly.PythonOcto.valueToCode(block, 'CONDITION',
      Blockly.PythonOcto.ORDER_NONE) || 'False';
  var code = 'if ' + condition + ':\n';
  if (block.hasReturnValue_) {
    var value = Blockly.PythonOcto.valueToCode(block, 'VALUE',
        Blockly.PythonOcto.ORDER_NONE) || 'None';
    code += '  return ' + value + '\n';
  } else {
    code += '  return\n';
  }
  return code;
};

Blockly.PythonOcto['procedures_namedsequence'] = function(block) {
  var name = Blockly.PythonOcto.variableDB_.getName(block.getFieldValue('NAME'),
      Blockly.Procedures.NAME_TYPE);
  var branch = Blockly.PythonOcto.statementToCode(block, 'STACK') || 'sequence()';
  if (Blockly.PythonOcto.STATEMENT_PREFIX) {
    branch = Blockly.PythonOcto.prefixLines(
        Blockly.PythonOcto.STATEMENT_PREFIX.replace(/%1/g,
        '\'' + block.id + '\''), Blockly.PythonOcto.INDENT) + branch;
  }
  if (Blockly.PythonOcto.INFINITE_LOOP_TRAP) {
    branch = Blockly.PythonOcto.INFINITE_LOOP_TRAP.replace(/%1/g,
        '"' + block.id + '"') + branch;
  }
  return name + ' = ' + branch;
};

Blockly.PythonOcto['procedures_callnamedsequence'] = function(block) {
  // Insert a named sequence
  var funcName = Blockly.PythonOcto.variableDB_.getName(block.getFieldValue('NAME'),
      Blockly.Procedures.NAME_TYPE);
  return funcName;
};
