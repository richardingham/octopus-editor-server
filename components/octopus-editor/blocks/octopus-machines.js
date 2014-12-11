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
 * @fileoverview Variable blocks for Blockly.
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';


var _R2R4_vars = [{
	name: "status", title: "Status", type: "String", readonly: true
}, {
	name: "power", title: "Power", type: "String"
}, {
	name: "pressure_limit", title: "Pressure Limit", type: "Number"
}, {
	name: "pressure", title: "System Pressure", type: "Number", readonly: true
}, {
	name: "output", title: "Output", type: "String"
}]
for (var i = 1; i < 3; i++) {
  _R2R4_vars.push({
    name: "pump" + i, title: "Pump " + String.fromCharCode(64 + i), parts: [
      { name: "target", title: "Target", type: "Number" },
      { name: "rate", title: "Flow Rate", type: "Number", readonly: true },
      { name: "pressure", title: "Pressure", type: "Number", readonly: true },
      { name: "input", title: "Input", type: "String" },
      { name: "airlock", title: "Airlock", type: "Number", readonly: true }
    ]
  });
}
for (var i = 1; i < 5; i++) {
  _R2R4_vars.push({
    name: "heater" + i, title: "Heater " + String.fromCharCode(64 + i), parts: [
      { name: "target", title: "Target", type: "Number" },
      { name: "temp", title: "Temperature", type: "Number", readonly: true },
      { name: "mode", title: "Mode", type: "Number", readonly: true },
      { name: "power", title: "Power", type: "Number", readonly: true }
    ]
  });
}

var _K120_vars = [
  { name: "status", title: "Status", type: "String", readonly: true },
	{ name: "power", title: "Power", type: "String" },
  { name: "target", title: "Target", type: "Number" },
  { name: "rate", title: "Flow Rate", type: "Number", readonly: true }
];
var _S100_vars = [
  { name: "status", title: "Status", type: "String", readonly: true },
	{ name: "power", title: "Power", type: "String" },
  { name: "target", title: "Target", type: "Number" },
  { name: "pressure", title: "Pressure", type: "Number", readonly: true },
  { name: "rate", title: "Flow Rate", type: "Number", readonly: true }
];

var _MultiValve_vars = [
  { name: "position", title: "Position", type: "Number" }
];

var _MultiValve_options = [
  { name: "num_positions", title: "Number of positions", type: "Number", min: 0 }
];

var _iCIR_vars = [];
var _iCIR_options = [
  { name: "stream_names", title: "Data Streams", type: "String", multi: true, createAttributes: { type: "Number", readonly: true } }
];

var _SingleTracker_vars = [
  { name: "height", title: "Height", type: "Number", readonly: true }
];

var _MultiTracker_vars = [];
var _MultiTracker_options = [
  { name: "count", title: "Number to track", type: "Number", createAttributes: { name: "height%", title: "Height #%", type: "Number", readonly: true } }
];

var _ARROW_CHAR = /*goog.userAgent.ANDROID ? ' \u25B6 ' :*/ ' \u25B8 ';

var machineBlock = {
  init: function() {
    var default_name = "reactor";
    var thisBlock = this;

    //this.setHelpUrl('http://www.example.com/');
    this.setColour(Blockly.MACHINES_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField(this.machineTitle + " ")
        .appendField(new Blockly.FieldMachineFlydown(
            default_name, //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_NAME,
            Blockly.FieldFlydown.DISPLAY_BELOW,
            this.rename_.bind(this)), 
        'NAME');
    this.appendValueInput("CONNECTION")
        .setCheck(this.machineConnectionType || "MachineConnection")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("connection");
    this.setTooltip('');
    this.setInputsInline(false);

    if (!this.isInFlyout) {
      var machineVars = this.machineVars;
      var machineVar = Blockly.GlobalScope.addVariable(default_name, "machine");
      machineVar.setType("component");
      machineVar.setReadonly("true");

      var addParts = function (variable, parts, titlePart) {
        var part;
        for (var i = 0; i < parts.length; i++) {
          part = parts[i];
          var display = titlePart + _ARROW_CHAR + part.title;
          var partVar = variable.addAttribute(part.name);
          partVar.setMenu(part.title);
          partVar.setDisplay(display);
          partVar.setType(part.parts ? "component" : part.type);
          partVar.setReadonly(part.readonly || part.parts);

          if (part.parts) {
            addParts(partVar, part.parts, display);
          }
        }
      }

      addParts(machineVar, machineVars, "");
      this.variable_ = machineVar;
      this.getField_('NAME').setValue(machineVar.getVarName());

      if (this.machineOptions) {
        // Decide whether or not there are options requiring draggable blocks
        var options = this.machineOptions, multi = false;
        for (var i = 0, max = options.length; i < max; i++) {
          multi |= !!options[i].multi;
        }
        this.mutation = {};
        this.setMutator(new Blockly.Mutator(
          multi ? ['machine_quark_argument'] : []
        ));

        this.decompose = function decompose (workspace) {
          var containerBlock = Blockly.Block.obtain(workspace, 'machine_quark');
          var mutation = thisBlock.mutation;
          containerBlock.initSvg();
          var opt;
          for (var i = 0, max = options.length; i < max; i++) {
            opt = options[i];
            if (opt.multi) {
              containerBlock.appendDummyInput().appendField(opt.title);
              containerBlock.appendStatementInput(opt.name);
              var connection = containerBlock.getInput(opt.name).connection;
              if (mutation[opt.name] && mutation[opt.name].length) {
                for (var x = 0; x < mutation[opt.name].length; x++) {
                  var subBlock = Blockly.Block.obtain(workspace, 'machine_quark_argument');
                  subBlock.setFieldValue(mutation[opt.name][x], 'VALUE');
                  subBlock.initSvg();
                  connection.connect(subBlock.previousConnection);
                  connection = subBlock.nextConnection;
                }
              }
            } else {
              if (opt.options) {
                containerBlock.appendDummyInput()
                  .appendField(new Blockly.FieldDropdown(
                    opt.options.map(function (o) { return [o, o]; })
                  ), opt.name);
                if (mutation[opt.name]) {
                  containerBlock.setFieldValue(mutation[opt.name], opt.name);
                }
              } else if (opt.type == "Number") {
                containerBlock.appendDummyInput()
                  .appendField(opt.title + ": ")
                  .appendField(new Blockly.FieldTextInput(
                    (mutation[opt.name] && mutation[opt.name].toString && mutation[opt.name].toString()) || '0',
                    Blockly.FieldTextInput.numberValidator
                  ), opt.name);
              } else if (opt.type == "String") {
                containerBlock.appendDummyInput()
                  .appendField(opt.title + ": ")
                  .appendField(new Blockly.FieldTextInput(mutation[opt.name] || ''), opt.name);
              }
            }
          }
          return containerBlock;
        };
        this.compose = function compose (containerBlock) {
          var block, opt, mutation = {};
          for (var i = 0, max = options.length; i < max; i++) {
            opt = options[i];
            if (opt.multi) {
              var values = [];
              block = containerBlock.getInputTargetBlock(opt.name);
              while (block) {
                values.push(block.getFieldValue('VALUE'));
                block = block.nextConnection &&
                  block.nextConnection.targetBlock();
              }
              mutation[opt.name] = values;
            } else {
              var value = containerBlock.getFieldValue(opt.name);
              mutation[opt.name] = opt.type === "Number" ? parseInt(value, 10) : value;
            }
          }
          thisBlock.mutation = mutation;
          thisBlock.applyMutation();
        };
        this.mutationToJSON = function mutationToJSON () {
          return JSON.stringify(thisBlock.mutation);
        };
        this.JSONToMutation = function JSONToMutation (obj) {
          thisBlock.mutation = obj;
          thisBlock.applyMutation();
        };
        this.mutationToDom = function mutationToDom () {
          if (!thisBlock.mutation) {
            return null;
          }
          var container = document.createElement('mutation');
          var opt;
          for (var i = 0, max = options.length; i < max; i++) {
            opt = options[i];
            if (opt.multi) {
              container.setAttribute(opt.name, JSON.stringify(thisBlock.mutation[opt.name]));
            } else {
              container.setAttribute(opt.name, thisBlock.mutation[opt.name]);
            }
          }
          return container;
        };
        this.domToMutation = function domToMutation (xmlElement) {
          var opt, mutation = {};
          for (var i = 0, max = options.length; i < max; i++) {
            opt = options[i];
            if (opt.multi) {
              mutation[opt.name] = JSON.parse(xmlElement.getAttribute(opt.name) || []);
            } else if (opt.type === "Number") {
              mutation[opt.name] = parseInt(xmlElement.getAttribute(opt.name) || 0, 10);
            } else {
              mutation[opt.name] = xmlElement.getAttribute(opt.name) || "";
            }
          }
          thisBlock.mutation = mutation;
          thisBlock.applyMutation();
        };
        this.applyMutation = function applyMutation (xmlElement) {
          var opt, attributes = machineVars.slice();
          for (var i = 0, max = options.length; i < max; i++) {
            opt = options[i];
            if (opt.createAttributes) {
              if (opt.multi) {
                thisBlock.mutation[opt.name].forEach(function (value) {
                  attributes.push(extend(opt.createAttributes, {
                    name: value,
                    title: value
                  }));
                });
              } else {
                var count = thisBlock.mutation[opt.name];
                for (var j = 0; j < count; j++) {
                  attributes.push(extend(opt.createAttributes, {
                    name: opt.createAttributes.name.replace('%', j + 1),
                    title: opt.createAttributes.title.replace('%', j + 1)
                  }));
                };
              }
            }
          }
          thisBlock.variable_.clearAttributes();
          addParts(thisBlock.variable_, attributes, "");
        };
      }
    }
  },

  /**
   * Return all variables referenced by this block.
   * @return {!Array.<string>} List of variable names.
   * @this Blockly.Block
   */
  getVars: function() {
    return [this.getFieldValue('NAME')];
  },

  rename_: function (newName) {
    var oldName = this.getFieldValue('NAME');
    if (oldName === newName && this.variable_) {
      return newName;
    }
    this.variable_.setName(newName);
    return this.variable_.getVarName();
  },

  disposed: function () {
    if (this.variable_) {
      this.variable_.getScope().removeVariable(this.variable_.getVarName());
    }
  }
};


Blockly.Blocks['machine_quark'] = {
  init: function() {
    //this.setHelpUrl(Blockly.Msg.CONTROLS_IF_HELPURL);
    this.setColour(Blockly.MACHINES_CATEGORY_HUE);
  }
};

Blockly.Blocks['machine_quark_argument'] = {
  init: function() {
    //this.setHelpUrl(Blockly.Msg.CONTROLS_IF_HELPURL);
    this.setColour(Blockly.MACHINES_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(''), 'VALUE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['machine_vapourtec_R2R4'] = extend(machineBlock, {
  machineTitle: "Vapourtec R2+/R4",
  machineVars: _R2R4_vars,
});

Blockly.Blocks['machine_knauer_K120'] = extend(machineBlock, {
  machineTitle: "Knauer K120",
  machineVars: _K120_vars,
});

Blockly.Blocks['machine_knauer_S100'] = extend(machineBlock, {
  machineTitle: "Knauer S100",
  machineVars: _S100_vars,
});

Blockly.Blocks['machine_vici_multivalve'] = extend(machineBlock, {
  machineTitle: "VICI multi-position valve",
  machineVars: _MultiValve_vars,
  machineOptions: _MultiValve_options,
});

Blockly.Blocks['machine_mt_icir'] = extend(machineBlock, {
  machineTitle: "MT FlowIR",
  machineVars: _iCIR_vars,
  machineOptions: _iCIR_options,
});

Blockly.Blocks['machine_singletracker'] = extend(machineBlock, {
  machineTitle: "Single Tracker",
  machineVars: _SingleTracker_vars,
  machineConnectionType: "CameraConnection"
});

Blockly.Blocks['machine_multitracker'] = extend(machineBlock, {
  machineTitle: "Multi Tracker",
  machineVars: _MultiTracker_vars,
  machineOptions: _MultiTracker_options,
  machineConnectionType: "CameraConnection"
});
