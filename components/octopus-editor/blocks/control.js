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
    this.setMutator(new Blockly.Mutator(['controls_dependents_dep']));

    this.dependentCount_ = 0;
  },
  /**
   * Create JSON to represent the number of dependents inputs.
   * @return {String} JSON representation of mutation.
   * @this Blockly.Block
   */
  mutationToJSON: function() {
    if (!this.dependentCount_) {
      return "{}";
    }
    return JSON.stringify({
      dependents: this.dependentCount_
    });
  },
  /**
   * Parse JSON to restore the dependents inputs.
   * @param {!String} JSON representation of mutation.
   * @this Blockly.Block
   */
  JSONToMutation: function(obj) {
    var count = obj.dependents && parseInt(obj.dependents, 10) || 0;
    this.update(count);
  },
  /**
   * Create XML to represent the number of dependents inputs.
   * @return {Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function() {
    if (!this.dependentCount_) {
      return null;
    }
    var container = document.createElement('mutation');
    if (this.dependentCount_) {
      container.setAttribute('dependents', this.dependentCount_);
    }
    return container;
  },
  /**
   * Parse XML to restore the dependents inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    this.JSONToMutation({
      'dependents': parseInt(xmlElement.getAttribute('dependents'), 10)
    });
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function(workspace) {
    var containerBlock = Blockly.Block.obtain(workspace, 'controls_dependents_deps');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var x = 1; x <= this.dependentCount_; x++) {
      var depBlock = Blockly.Block.obtain(workspace, 'controls_dependents_dep');
      depBlock.initSvg();
      connection.connect(depBlock.previousConnection);
      connection = depBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function(containerBlock) {
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    var newCount = 0, connections = {};

    // Calculate changes
    while (clauseBlock) {
      if (clauseBlock.type != 'controls_dependents_dep') {
        throw 'Unknown block type.';
      }

      connections['DEP' + newCount] = clauseBlock.connection_
      newCount++;

      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }

    this.update(newCount, connections);
  },

  update: function (newCount, newConnections) {    
    // Add / remove else if inputs as necessary
    if (newCount > this.dependentCount_) {
      for (var x = this.dependentCount_; x < newCount; x++) {
        this.appendValueInput('DEP' + x)
          .setCheck('Control')
          .appendField('with'); //Blockly.Msg.CONTROLS_IF_MSG_ELSEIF);
      }
    } else {
      for (var x = this.dependentCount_; x > newCount; x--) {
        this.removeInput('DEP' + (x - 1));
      }
    }
    this.dependentCount_ = newCount;

    if (newConnections) {
      var input, inputName, connect = {};

      // Disconnections
      for (var x = 0; x < newCount; x++) {
        inputName = 'DEP' + x;
        if (newConnections[inputName] != this.connections_[inputName]) {
          input = this.getInput(inputName);
          if (input && input.connection.targetConnection) {
            input.connection.targetBlock().setParent();
          }
          connect[inputName] = newConnections[inputName];
        }
      }

      // Connections.
      var targetConnection;
      for (var inputName in connect) {
        targetConnection = connect[inputName];
        input = this.getInput(inputName);
        input && targetConnection && input.connection.connect(targetConnection);
      }
    }
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function(containerBlock) {
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    var input, x = 0;

    this.connections_ = {};

    while (clauseBlock) {
      if (clauseBlock.type != 'controls_dependents_dep') {
        throw 'Unknown block type.';
      }

      input = this.getInput('DEP' + x);
      clauseBlock.connection_ =
          input && input.connection.targetConnection;
      this.connections_['DEP' + x] = clauseBlock.connection_;

      x++;

      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  }
};

Blockly.Blocks['controls_dependents_deps'] = {
  /**
   * Mutator block for dependents container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField('controls'); //Blockly.Msg.CONTROLS_IF_IF_TITLE_IF);
    this.appendStatementInput('STACK');
    //this.setTooltip(Blockly.Msg.CONTROLS_IF_IF_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['controls_dependents_dep'] = {
  /**
   * Mutator block for dependent.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField('control'); //Blockly.Msg.CONTROLS_IF_ELSEIF_TITLE_ELSEIF);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    //this.setTooltip(Blockly.Msg.CONTROLS_IF_ELSEIF_TOOLTIP);
    this.contextMenu = false;
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
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ");
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
    this.appendValueInput('TEST0')
        .appendField("test")
        .setAlign(Blockly.ALIGN_RIGHT)
        .setCheck('Boolean');
    this.appendDummyInput('TRIGGER_MSG')
        .appendField("if any false:"); //Blockly.Msg.CONTROLS_STATEMONITOR_TRIGGER);
    this.appendStatementInput('TRIGGER');
    this.appendDummyInput()
        .appendField("if all true:"); //Blockly.Msg.CONTROLS_STATEMONITOR_TRIGGER);
    this.appendStatementInput('RESET');
    this.setOutput(true, 'Control');
    this.setMutator(new Blockly.Mutator(['controls_statemonitor_test']));

    this.mutation_ = {
      tests: 1
    };
    withMutation.call(this, function () {
      return this.mutation_.tests === 1;
    });
  },

  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function(workspace) {
    var containerBlock = Blockly.Block.obtain(workspace, 'controls_statemonitor_tests');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var x = 1; x <= this.mutation_.tests; x++) {
      var depBlock = Blockly.Block.obtain(workspace, 'controls_statemonitor_test');
      depBlock.initSvg();
      connection.connect(depBlock.previousConnection);
      connection = depBlock.nextConnection;
    }
    return containerBlock;
  },

  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function(containerBlock) {
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    var newCount = 0, connections = {};

    // Calculate changes
    while (clauseBlock) {
      if (clauseBlock.type != 'controls_statemonitor_test') {
        throw 'Unknown block type.';
      }

      connections['TEST' + newCount] = clauseBlock.connection_;
      newCount++;

      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }

    this.update({ tests: newCount }, connections);
  },

  update: function (mutation, newConnections) {
    var newCount = mutation.tests || 0;

    // Add / remove else if inputs as necessary
    if (newCount > this.mutation_.tests) {
      for (var x = this.mutation_.tests; x < newCount; x++) {
        this.appendValueInput('TEST' + x)
          .appendField("test")
          .setAlign(Blockly.ALIGN_RIGHT)
          .setCheck('Boolean');
        this.moveInputBefore('TEST' + x, 'TRIGGER_MSG');
      }
    } else {
      for (var x = this.mutation_.tests; x > newCount; x--) {
        this.removeInput('TEST' + (x - 1));
      }
    }
    this.mutation_.tests = newCount;

    if (newConnections) {
      var input, inputName, connect = {};

      // Disconnections
      for (var x = 0; x < newCount; x++) {
        inputName = 'TEST' + x;
        if (newConnections[inputName] != this.connections_[inputName]) {
          input = this.getInput(inputName);
          if (input && input.connection.targetConnection) {
            input.connection.targetBlock().setParent();
          }
          connect[inputName] = newConnections[inputName];
        }
      }

      // Connections.
      var targetConnection;
      for (var inputName in connect) {
        targetConnection = connect[inputName];
        input = this.getInput(inputName);
        input && targetConnection && input.connection.connect(targetConnection);
      }
    }
  },

  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function(containerBlock) {
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    var input, x = 0;

    this.connections_ = {};

    while (clauseBlock) {
      if (clauseBlock.type != 'controls_statemonitor_test') {
        throw 'Unknown block type.';
      }

      input = this.getInput('TEST' + x);
      clauseBlock.connection_ =
          input && input.connection.targetConnection;
      this.connections_['TEST' + x] = clauseBlock.connection_;

      x++;

      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  }
};

Blockly.Blocks['controls_statemonitor_tests'] = {
  /**
   * Mutator block for statemonitor tests container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField('tests'); //Blockly.Msg.CONTROLS_IF_IF_TITLE_IF);
    this.appendStatementInput('STACK');
    //this.setTooltip(Blockly.Msg.CONTROLS_IF_IF_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['controls_statemonitor_test'] = {
  /**
   * Mutator block for test.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(Blockly.CONTROL_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField('test'); //Blockly.Msg.CONTROLS_IF_ELSEIF_TITLE_ELSEIF);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    //this.setTooltip(Blockly.Msg.CONTROLS_IF_ELSEIF_TOOLTIP);
    this.contextMenu = false;
  }
};
