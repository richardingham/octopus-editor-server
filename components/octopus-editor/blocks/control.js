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
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
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

Blockly.Blocks['controls_if'] = {
  /**
   * Block for if/elseif/else condition.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl(Blockly.Msg.CONTROLS_IF_HELPURL);
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendValueInput('IF0')
        .setCheck('Boolean')
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.appendStatementInput('DO0')
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.setPreviousStatement(true);
    this.setNextStatement(true);

    var thisBlock = this;
    this.setTooltip(function() {
      if (!thisBlock.mutation_.elseif && !thisBlock.mutation_.else) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_1;
      } else if (!thisBlock.mutation_.elseif && thisBlock.mutation_.else) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_2;
      } else if (thisBlock.mutation_.elseif && !thisBlock.mutation_.else) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_3;
      } else if (thisBlock.mutation_.elseif && thisBlock.mutation_.else) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_4;
      }
      return '';
    });

    this.mutationConfig = {
      parts: [{
        name: 'elseif',
        default: 0,
        counterStart: 1,
        input: [{
          name: 'IF',
          type: 'value',
          check: 'Boolean',
          text: Blockly.Msg.CONTROLS_IF_MSG_ELSEIF
        }, {
          name: 'DO',
          type: 'statement',
          text: Blockly.Msg.CONTROLS_IF_MSG_THEN
        }],
        editor: {
          text: Blockly.Msg.CONTROLS_IF_ELSEIF_TITLE_ELSEIF,
          tooltip: Blockly.Msg.CONTROLS_IF_ELSEIF_TOOLTIP
        }
      }, {
        name: 'else',
        default: 0,
        isFinal: true,
        input: [{
          name: 'ELSE',
          type: 'statement',
          text: Blockly.Msg.CONTROLS_IF_MSG_ELSE
        }],
        editor: {
          text: Blockly.Msg.CONTROLS_IF_ELSE_TITLE_ELSE,
          tooltip: Blockly.Msg.CONTROLS_IF_ELSE_TOOLTIP
        }
      }],
      editor: {
        text: Blockly.Msg.CONTROLS_IF_IF_TITLE_IF,
        tooltip: Blockly.Msg.CONTROLS_IF_IF_TOOLTIP
      },
      postUpdate: function (mutation) {
        if (mutation.else > 0) {
          this.moveInputBefore('ELSE');
        }
      }
    };
    withMutation.call(this, this.mutationConfig);
  }
};

Blockly.Blocks['controls_parallel'] = {
  /**
   * Block for parallel sequence
   * @this Blockly.Block
   */
  init: function() {
    //this.setHelpUrl(Blockly.Msg.CONTROLS_DEPENDENTS_HELPURL);
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField("run in parallel"); //Blockly.Msg.CONTROLS_PARALLEL_STACK);
    this.setPreviousStatement(true);
    this.setNextStatement(true);

    this.mutationConfig = {
      parts: [{
        name: 'stacks',
        default: 1,
        input: {
          name: 'STACK',
          type: 'statement'
        },
        editor: {
          text: 'block',
          //tooltip: Blockly.Msg.
        }
      }],
      editor: {
        text: 'blocks',
        //tooltip: Blockly.Msg.
      }
    };
    withMutation.call(this, this.mutationConfig);
  }
};

Blockly.Blocks['controls_dependents'] = {
  /**
   * Block for sequence with dependents
   * @this Blockly.Block
   */
  init: function() {
    //this.setHelpUrl(Blockly.Msg.CONTROLS_DEPENDENTS_HELPURL);
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField("run with controls"); //Blockly.Msg.CONTROLS_DEPENDENTS_STACK);
    this.appendStatementInput('STACK');
    this.setPreviousStatement(true);
    this.setNextStatement(true);

    this.mutationConfig = {
      parts: [{
        name: 'dependents',
        default: 1,
        input: {
          name: 'DEP',
          type: 'value',
          align: Blockly.ALIGN_RIGHT,
          text: 'with',
          check: 'Control'
        },
        editor: {
          text: 'control',
          //tooltip: Blockly.Msg.
        }
      }],
      editor: {
        text: 'controls',
        //tooltip: Blockly.Msg.
      }
    };
    withMutation.call(this, this.mutationConfig);
  }
};

Blockly.Blocks['controls_bind'] = {
  /**
   * Block for a bind control.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl(Blockly.Msg.MATH_CHANGE_HELPURL);
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ", { readonly: false });
    this.fieldVar_.setBlock(this);
    this.setInputsInline(true);
    this.appendValueInput('VALUE')
      .appendField('bind')
      .appendField(this.fieldVar_, 'VAR')
      .appendField('to');
    this.setOutput(true, 'Control');

    withVariableDropdown.call(this, this.fieldVar_, 'VAR');
  },
  setVarType_: function (type) {
    this.getInput('VALUE').setCheck(type);
  }
};


Blockly.Blocks['controls_statemonitor'] = {
  /**
   * Block for statemonitor control
   * @this Blockly.Block
   */
  init: function() {
    //this.setHelpUrl(Blockly.Msg.CONTROLS_DEPENDENTS_HELPURL);
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendDummyInput('TRIGGER_MSG')
        .appendField("if any false:"); //Blockly.Msg.CONTROLS_STATEMONITOR_TRIGGER);
    this.appendStatementInput('TRIGGER');
    this.appendDummyInput('RESET_MSG')
        .appendField("if all true:"); //Blockly.Msg.CONTROLS_STATEMONITOR_TRIGGER);
    this.appendStatementInput('RESET');
    this.setOutput(true, 'Control');

    this.mutationConfig = {
      parts: [{
        name: 'tests',
        default: 1,
        input: {
          name: 'TEST',
          type: 'value',
          align: Blockly.ALIGN_RIGHT,
          text: 'test',
          check: 'Boolean'
        },
        editor: {
          text: 'test',
          //tooltip: Blockly.Msg.
        }
      }],
      editor: {
        text: 'tests',
        //tooltip: Blockly.Msg.
      },
      postUpdate: function () {
        this.moveInputBefore('TRIGGER_MSG');
        this.moveInputBefore('TRIGGER');
        this.moveInputBefore('RESET_MSG');
        this.moveInputBefore('RESET');
      }
    };
    withMutation.call(this, this.mutationConfig);
  }
};
