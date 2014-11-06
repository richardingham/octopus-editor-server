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
 * @fileoverview Generating Python-Octo for variable blocks.
 * @author q.neutron@gmail.com (Quynh Neutron)
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';


Blockly.PythonOcto.getVariableName_ = function (variable) {
  if (!variable) {
    return "_";
  }

  var split_ns = variable.getNamespace().split(".");
  var attr = variable.getVarAttribute();
  var prefix = variable.getScope().isGlobal() ? split_ns[1] + "_" : "";
  var name = Blockly.PythonOcto.variableDB_.getName(
    variable.getVarName(), 
    Blockly.Variables.NAME_TYPE
  );

  return prefix + name + (attr ? "." + attr : "");
};

Blockly.PythonOcto['lexical_variable_get'] = function(block) {
  // Variable getter.
  var name = Blockly.PythonOcto.getVariableName_(block.getVariable());
  return [name, Blockly.PythonOcto.ORDER_ATOMIC];
};

Blockly.PythonOcto['lexical_variable_set'] = function(block) {
  // Variable setter.
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'VALUE',
      Blockly.PythonOcto.ORDER_NONE) || '0';
  var name = Blockly.PythonOcto.getVariableName_(block.getVariable());
  return 'set(' + name + ', ' + argument0 + ')';
};

Blockly.PythonOcto['global_declaration'] = function(block) {
  var argument0 = Blockly.PythonOcto.valueToCode(block, 'VALUE',
      Blockly.PythonOcto.ORDER_NONE) || '0';
  var name = Blockly.PythonOcto.getVariableName_(block.variable_);
  return name + ' = variable(' + argument0 + ')';
};
