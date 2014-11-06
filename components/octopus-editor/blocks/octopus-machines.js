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
	name: "power", title: "Power", type: "String"
},{
	name: "pressure", title: "System Pressure", type: "Number", readonly: true
}, {
	name: "pump1", title: "Pump A", parts: [
		{ name: "target", title: "Target", type: "Number" },
		{ name: "rate", title: "Flow Rate", type: "Number", readonly: true },
		{ name: "pressure", title: "Pressure", type: "Number", readonly: true },
		{ name: "input", title: "Input", type: "String" },
		{ name: "airlock", title: "Airlock", type: "Number", readonly: true }
	]
}, {
	name: "heater1", title: "Heater A", parts: [
		{ name: "target", title: "Target", type: "Number" },
		{ name: "temp", title: "Temperature", type: "Number", readonly: true },
		{ name: "mode", title: "Mode", type: "Number", readonly: true },
		{ name: "power", title: "Power", type: "Number", readonly: true }
	]
}, {
	name: "heater2", title: "Heater B", parts: [
		{ name: "target", title: "Target", type: "Number" },
		{ name: "temp", title: "Temperature", type: "Number", readonly: true },
		{ name: "mode", title: "Mode", type: "Number", readonly: true },
		{ name: "power", title: "Power", type: "Number", readonly: true }
	]
}]

var _ARROW_CHAR = /*goog.userAgent.ANDROID ? ' \u25B6 ' :*/ ' \u25B8 ';

Blockly.Blocks['machine_vapourtec_R2R4'] = {
  init: function() {
	var default_name = "reactor";

    //this.setHelpUrl('http://www.example.com/');
    this.setColour(0);
    this.appendDummyInput()
        .appendField("Vapourtec R2+/R4 ")
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
		
		addParts(machineVar, _R2R4_vars, "");
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
  },

  getVariablesMenu: function(name, forSetter) {
	return [
	  ["Pump A", [name, "pump1"], forSetter, [
	    ["Target", [name, "pump1", "target"]],
	    ["Flow Rate", [name, "pump1", "rate"], forSetter],
	    ["Pressure", [name, "pump1", "pressure"], forSetter]
	  ]],
	  ["Pump B", [name, "pump2"], forSetter, [
	    ["Target", [name, "pump2", "target"]],
	    ["Flow Rate", [name, "pump2", "rate"], forSetter],
	    ["Pressure", [name, "pump2", "pressure"], forSetter]
	  ]],
	];
  }
};
