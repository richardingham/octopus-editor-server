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
 * @fileoverview Timing blocks for Blockly.
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';


Blockly.Blocks['controls_wait'] = {
  /**
   * Block for wait (time) statement
   * @this Blockly.Block
   */
  init: function() {
    //this.setHelpUrl(Blockly.Msg.CONTROLS_WAIT_HELPURL);
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendValueInput('TIME')
        .setCheck('Number')
        .appendField('wait for'); //Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Pause the sequence for the specified time (in seconds)'); //Blockly.Msg.CONTROLS_WAIT_TOOLTIP);
  }
};

Blockly.Blocks['controls_wait_until'] = {
  /**
   * Block for wait_until statement
   * @this Blockly.Block
   */
  init: function() {
    //this.setHelpUrl(Blockly.Msg.CONTROLS_WAIT_HELPURL);
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendValueInput('CONDITION')
        .setCheck('Boolean')
        .appendField('wait until'); //Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Pause the sequence until the passed condition is met'); //Blockly.Msg.CONTROLS_WAIT_TOOLTIP);
  }
};

Blockly.Blocks['controls_maketime'] = {
  /**
   * Block for time value.
   * @this Blockly.Block
   */
  init: function() {
    this.fieldHour_ = new Blockly.FieldTextInput(
      '0',
      Blockly.FieldTextInput.numberValidator
    );
    this.fieldMinute_ = new Blockly.FieldTextInput(
      '0',
      Blockly.FieldTextInput.numberValidator
    );
    this.fieldSecond_ = new Blockly.FieldTextInput(
      '0',
      Blockly.FieldTextInput.numberValidator
    );
    //this.setHelpUrl(Blockly.Msg.MATH_NUMBER_HELPURL);
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField(this.fieldHour_, 'HOUR')
        .appendField('h')
        .appendField(this.fieldMinute_, 'MINUTE')
        .appendField('m')
        .appendField(this.fieldSecond_, 'SECOND')
        .appendField('s');
    this.setOutput(true, 'Number');
    this.setTooltip('Calculates a time in seconds'); // Blockly.Msg.CONTROLS_TIME_TOOLTIP);
  }
};