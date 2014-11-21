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

var _ARROW_CHAR = /*goog.userAgent.ANDROID ? ' \u25B6 ' :*/ ' \u25B8 ';

var extend = function (defaults, options) {
    var extended = {};
    var prop;
    for (prop in defaults) {
        if (Object.prototype.hasOwnProperty.call(defaults, prop)) {
            extended[prop] = defaults[prop];
        }
    }
    for (prop in options) {
        if (Object.prototype.hasOwnProperty.call(options, prop)) {
            extended[prop] = options[prop];
        }
    }
    return extended;
};

var machineBlock = {
  init: function() {
    var default_name = "reactor";

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
        .setCheck("machine-connection")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("connection");
    this.setTooltip('');
    this.setInputsInline(false);

    if (!this.isInFlyout) {
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

      addParts(machineVar, this.machineVars, "");
      this.variable_ = machineVar;
      this.getField_('NAME').setValue(machineVar.getVarName());
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

  /**
   * Notification that a variable is renaming.
   * If the name matches one of this block's variables, rename it.
   * @param {string} oldName Previous name of variable.
   * @param {string} newName Renamed variable.
   * @this Blockly.Block
   */
   // No external rename allowed?
  /*renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('NAME'))) {
      this.setFieldValue(newName, 'NAME');
    }
  },*/

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
});
