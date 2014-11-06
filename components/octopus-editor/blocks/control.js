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


Blockly.Blocks['controls_run'] = {
  /**
   * Block for run statement
   * @this Blockly.Block
   */
  init: function() {
    //this.setHelpUrl(Blockly.Msg.CONTROLS_WAIT_HELPURL);
    this.setColour(5);
    this.appendDummyInput()
        .appendField('run')
		.appendField(new Blockly.FieldDropdown([
			['immediately', 'IMMEDIATELY'],
			['paused', 'PAUSED']
		]), 'MODE');
    this.appendStatementInput('STACK');
    this.setTooltip('Runs the sequence on execution'); //Blockly.Msg.CONTROLS_WAIT_TOOLTIP);
  }
};
