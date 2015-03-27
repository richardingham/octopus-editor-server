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
  name: "power", title: "Power", type: "String", options: ['off', 'on']
}, {
  name: "loop1", title: "Loop A", type: "String", options: ['load', 'inject']
}, {
  name: "loop2", title: "Loop B", type: "String", options: ['load', 'inject']
}, {
  name: "pressure_limit", title: "Pressure Limit", type: "Number", unit: 'mbar'
}, {
  name: "pressure", title: "System Pressure", type: "Number", readonly: true
}, {
  name: "output", title: "Output", type: "String", options: ['waste', 'collect']
}]
for (var i = 1; i < 3; i++) {
  _R2R4_vars.push({
    name: "pump" + i, title: "Pump " + String.fromCharCode(64 + i), parts: [
      { name: "target", title: "Target", type: "Number", unit: 'uL/min' },
      { name: "rate", title: "Flow Rate", type: "Number", readonly: true },
      { name: "pressure", title: "Pressure", type: "Number", readonly: true },
      { name: "input", title: "Input", type: "String", options: ['solvent', 'reagent'] },
      { name: "airlock", title: "Airlock", type: "Number", readonly: true }
    ]
  });
}
for (var i = 1; i < 5; i++) {
  _R2R4_vars.push({
    name: "heater" + i, title: "Heater " + String.fromCharCode(64 + i), parts: [
      { name: "target", title: "Target", type: "Number", unit: 'C' },
      { name: "temp", title: "Temperature", type: "Number", readonly: true },
      { name: "mode", title: "Mode", type: "Number", readonly: true },
      { name: "power", title: "Power", type: "Number", readonly: true }
    ]
  });
}

var _K120_vars = [
  { name: "status", title: "Status", type: "String", readonly: true },
  { name: "power", title: "Power", type: "String", options: ['off', 'on'] },
  { name: "target", title: "Target", type: "Number", unit: 'uL/min' },
  { name: "rate", title: "Flow Rate", type: "Number", readonly: true }
];
var _S100_vars = [
  { name: "status", title: "Status", type: "String", readonly: true },
  { name: "power", title: "Power", type: "String", options: ['off', 'on'] },
  { name: "target", title: "Target", type: "Number", unit: 'uL/min' },
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
    var default_name = this.machineDefaultName || "reactor";

    var thisBlock = this;
    this.fieldName_ = new Blockly.FieldMachineFlydown(
      default_name, //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_NAME,
      Blockly.FieldFlydown.DISPLAY_BELOW,
      this.rename_.bind(this)
    );

    //this.setHelpUrl('http://www.example.com/');
    this.setColour(Blockly.MACHINES_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField(this.machineTitle + " ")
        .appendField(this.fieldName_, 'NAME');
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

      if (this.machineVarFlags) {
        machineVar.flags = this.machineVarFlags;
      }

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

          if (part.flags) {
            partVar.flags = part.flags;
          }

          if (part.options) {
            partVar.flags.options = part.options;
          }

          if (part.unit) {
            partVar.flags.unit = part.unit;
          }

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
              mutation[opt.name] = opt.type === "Number" ? parseFloat(value) : value;
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
              mutation[opt.name] = parseFloat(xmlElement.getAttribute(opt.name) || 0);
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
  machineVarFlags: { providesGSIOC: true }
});

Blockly.Blocks['machine_knauer_K120'] = extend(machineBlock, {
  machineTitle: "Knauer K120",
  machineDefaultName: "pump",
  machineVars: _K120_vars,
});

Blockly.Blocks['machine_knauer_S100'] = extend(machineBlock, {
  machineTitle: "Knauer S100",
  machineDefaultName: "pump",
  machineVars: _S100_vars,
});

Blockly.Blocks['machine_vici_multivalve'] = extend(machineBlock, {
  machineTitle: "VICI multi-position valve",
  machineDefaultName: "valve",
  machineVars: _MultiValve_vars,
  machineOptions: _MultiValve_options,
});

Blockly.Blocks['machine_mt_icir'] = extend(machineBlock, {
  machineTitle: "MT FlowIR",
  machineDefaultName: "ir",
  machineVars: _iCIR_vars,
  machineOptions: _iCIR_options,
});

Blockly.Blocks['machine_wpi_aladdin'] = extend(machineBlock, {
  machineTitle: "WPI Aladdin syringe pump",
  machineDefaultName: "pump",
  machineVars: [
    { name: "status", title: "Status", type: "String", readonly: true },
    { name: "rate", title: "Flow rate", type: "Number", unit: 'uL/min' },
    { name: "direction", title: "Direction", type: "String", options: ['infuse', 'withdraw'] },
    { name: "dispensed", title: "Dispensed volume", type: "Number", readonly: true },
    { name: "withdrawn", title: "Withdrawn volume", type: "Number", readonly: true }
  ],
  machineOptions: [
    { name: "syringe_diameter", title: "Syringe Diameter /mm", type: "Number", min: 0 }
  ]
});

Blockly.Blocks['machine_phidgets_phsensor'] = extend(machineBlock, {
  machineTitle: "Phidgets pH Sensor",
  machineDefaultName: "phsensor",
  machineVars: [
    { name: "ph", title: "pH Reading", type: "Number", readonly: true },
    { name: "temperature", title: "Temperature", type: "Number", unit: 'C' }
  ],
  machineOptions: [
    { name: "min_change", title: "Minimum pH Change", type: "Number", min: 0 }
  ],
  machineConnectionType: "PhidgetConnection"
});

Blockly.Blocks['machine_imageprovider'] = extend(machineBlock, {
  machineTitle: "Image Provider",
  machineDefaultName: "camera",
  machineVars: [
    { name: "image", title: "Image", type: "Image", readonly: true }
  ],
  machineConnectionType: "CameraConnection"
});

Blockly.Blocks['machine_singletracker'] = extend(machineBlock, {
  machineTitle: "Single Tracker",
  machineDefaultName: "tracker",
  machineVars: _SingleTracker_vars,
  machineConnectionType: "CameraConnection"
});

Blockly.Blocks['machine_multitracker'] = extend(machineBlock, {
  machineTitle: "Multi Tracker",
  machineDefaultName: "tracker",
  machineVars: _MultiTracker_vars,
  machineOptions: _MultiTracker_options,
  machineConnectionType: "CameraConnection"
});

Blockly.Blocks['machine_omega_hh306a'] = extend(machineBlock, {
  machineTitle: "Omega HH306A",
  machineDefaultName: "thermocouple",
  machineVars: [
    { name: "temp1", title: "Temperature 1", type: "Number", readonly: true },
    { name: "temp2", title: "Temperature 2", type: "Number", readonly: true }
  ]
});

Blockly.Blocks['machine_harvard_phd2000'] = extend(machineBlock, {
  machineTitle: "Harvard PHD2000 infuse-only syringe pump",
  machineDefaultName: "pump",
  machineVars: [
    { name: "status", title: "Status", type: "String", readonly: true },
    { name: "rate", title: "Flow rate", type: "Number", unit: 'uL/min' },
    { name: "dispensed", title: "Dispensed volume", type: "Number", readonly: true },
    { name: "target_volume", title: "Target volume", type: "Number", unit: 'mL' }
  ],
  machineOptions: [
    { name: "syringe_diameter", title: "Syringe Diameter /mm", type: "Number", min: 0 }
  ]
});

Blockly.Blocks['machine_mt_sics_balance'] = extend(machineBlock, {
  machineTitle: "MT Balance (SICS)",
  machineDefaultName: "balance",
  machineVars: [
    { name: "status", title: "Status", type: "String", readonly: true },
    { name: "weight", title: "Weight", type: "Number", readonly: true }
  ]
});

Blockly.Blocks['machine_startech_powerremotecontrol'] = extend(machineBlock, {
  machineTitle: "StarTech Power Remote Control",
  machineDefaultName: "powerswitch",
  machineVars: [
    { name: "current", title: "Current", type: "Number", readonly: true },
    { name: "port1", title: "Port 1", type: "String", options: ['off', 'on'] },
    { name: "port2", title: "Port 2", type: "String", options: ['off', 'on'] },
    { name: "port3", title: "Port 3", type: "String", options: ['off', 'on'] },
    { name: "port4", title: "Port 4", type: "String", options: ['off', 'on'] },
    { name: "port5", title: "Port 5", type: "String", options: ['off', 'on'] },
    { name: "port6", title: "Port 6", type: "String", options: ['off', 'on'] },
    { name: "port7", title: "Port 7", type: "String", options: ['off', 'on'] },
    { name: "port8", title: "Port 8", type: "String", options: ['off', 'on'] }
  ]
});

Blockly.Blocks['machine_gilson_FractionCollector203B'] = extend(machineBlock, {
  machineTitle: "Gilson Fraction Collector 203B",
  machineDefaultName: "fractioncollector",
  machineVars: [
    { name: "position", title: "Position", type: "Number" },
    { name: "valve", title: "Valve", type: "String", options: ['waste', 'collect'] }
  ],
  machineConnectionType: "GSIOCConnection"
});
