/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
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
 * @fileoverview Colour blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';


Blockly.Blocks['colour_picker'] = {
  /**
   * Block for colour picker.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl(Blockly.Msg.COLOUR_PICKER_HELPURL);
    this.setColour(Blockly.MATH_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField(new Blockly.FieldColour('#ff0000'), 'COLOUR');
    this.setOutput(true, 'Colour');
    this.setTooltip(Blockly.Msg.COLOUR_PICKER_TOOLTIP);
  }
};
