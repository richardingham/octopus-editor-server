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
 * @fileoverview Generating Python for image blocks.
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';

Blockly.PythonOcto['image_findcolour'] = function(block) {
  var input = Blockly.PythonOcto.valueToCode(block, 'INPUT', Blockly.PythonOcto.ORDER_NONE) || 'None';
  code = 'image.select(' + input + ', "' + block.getFieldValue('OP').toLowerCase() + '")';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['image_threshold'] = function(block) {
  var input = Blockly.PythonOcto.valueToCode(block, 'INPUT', Blockly.PythonOcto.ORDER_NONE) || 'None';
  code = 'image.threshold(' + input + ', ' + parseInt(block.getFieldValue('THRESHOLD')) + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['image_threshold'] = function(block) {
  var input = Blockly.PythonOcto.valueToCode(block, 'INPUT', Blockly.PythonOcto.ORDER_NONE) || 'None';
  code = 'image.erode(' + input + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['image_tonumber'] = function(block) {
  var input = Blockly.PythonOcto.valueToCode(block, 'INPUT', Blockly.PythonOcto.ORDER_NONE) || 'None';
  code = 'image.calculate(' + input + ', "' + block.getFieldValue('OP') + '")';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};
