/**
 * @license
 * Visual Blocks Editor
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
 * @fileoverview Math blocks for Blockly.
 * @author q.neutron@gmail.com (Quynh Neutron)
 */
'use strict';

Blockly.Blocks['image_findcolour'] = {
  /**
   * Block for filtering a colour of an image
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS =
        [['red', 'RED'],
         ['green', 'GREEN'],
         ['blue', 'BLUE']];
    //this.setHelpUrl(Blockly.Msg.MATH_SINGLE_HELPURL);
    this.setColour(Blockly.MATH_CATEGORY_HUE);
    this.setOutput(true, 'Image');
    this.appendValueInput('INPUT')
        .setCheck('Image')
        .appendField('select')
        .appendField(new Blockly.FieldDropdown(OPERATORS), 'OP');
  }
};

Blockly.Blocks['image_threshold'] = {
  /**
   * Block for filtering an image
   * @this Blockly.Block
   */
  init: function() {
    this.fieldNumber_ = new Blockly.FieldTextInput(
      '0',
      Blockly.FieldTextInput.numberValidator
    );
    //this.setHelpUrl(Blockly.Msg.MATH_SINGLE_HELPURL);
    this.setColour(Blockly.MATH_CATEGORY_HUE);
    this.setOutput(true, 'Image');
    this.appendValueInput('INPUT')
        .setCheck('Image')
        .appendField('threshold')
        .appendField(this.fieldNumber_, 'THRESHOLD');
  }
};

Blockly.Blocks['image_erode'] = {
  /**
   * Block for eroding an image
   * @this Blockly.Block
   */
  init: function() {
    //this.setHelpUrl(Blockly.Msg.MATH_SINGLE_HELPURL);
    this.setColour(Blockly.MATH_CATEGORY_HUE);
    this.setOutput(true, 'Image');
    this.appendValueInput('INPUT')
        .setCheck('Image')
        .appendField('erode');
  }
};

Blockly.Blocks['image_tonumber'] = {
  /**
   * Block for getting a number from an image
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS =
        [['centroid x', 'CENTROIDX'],
         ['centroid y', 'CENTROIDY'],
         ['size x', 'SIZEX'],
         ['size y', 'SIZEY']];
    //this.setHelpUrl(Blockly.Msg.MATH_SINGLE_HELPURL);
    this.setColour(Blockly.MATH_CATEGORY_HUE);
    this.setOutput(true, 'Number');
    this.appendValueInput('INPUT')
        .setCheck('Image')
        .appendField('calculate')
        .appendField(new Blockly.FieldDropdown(OPERATORS), 'OP');
  }
};