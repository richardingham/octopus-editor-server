
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

function withVariableDropdown (field, fieldName) {

  function changeParent_ () {
		var val = field.getFullVariableName();
		var scope = this.getVariableScope();
		var newVar = scope && scope.getScopedVariable(field.getFullVariableName());
		if (newVar) {
			field.setValue(newVar);
		}
	};

  this.on("parent-changed", changeParent_);

  /**
   * Get the variable currently referenced by this block,
   * accounting for scope.
   * @return {Blockly.Variable} variable The variable.
   * @this Blockly.Block
   */
  this.getVariable = function getVariable () {
    var scope = this.getVariableScope();
    return scope && scope.getScopedVariable(field.getFullVariableName());
  };

  /**
   * Notification that a variable is renaming.
   * If the name matches one of this block's variables, rename it.
   * @param {string} oldName Previous name of variable.
   * @param {string} newName Renamed variable.
   * @param {Blockly.Variable} variable The variable in question.
   * @this Blockly.Block
   */
  this.renameVar = function renameVar (oldName, newName, variable) {
    if (Blockly.Names.equals(oldName, field.getFullVariableName())) {
      field.setValue(variable);
    }
  };

  /**
   * Emit an event that this variable's name has changed
   * @param {string} name New (full) name of variable.
   * @this Blockly.Block
   */
  this.announceRename = function announceRename (name) {
    if (Blockly.Names.equals(name, field.getFullVariableName())) {
      this.workspaceEmit("block-set-field-value", { id: this.id, field: fieldName, value: name });
    }
  };

  /**
   * Return all variables referenced by this block.
   * @return {!Array.<string>} List of variable names.
   * @this Blockly.Block
   */
  this.getVars = function getVars () {
    return [field.getFullVariableName()];
  };
}

function withMutation (mutationDefault) {
  mutationDefault = mutationDefault.bind(this);

  /**
   * Create JSON to represent the number of test inputs.
   * @return {String} JSON representation of mutation.
   * @this Blockly.Block
   */
  this.mutationToJSON = function mutationToJSON () {
    return JSON.stringify(this.mutation_);
  };

  /**
   * Parse JSON to restore the dependents inputs.
   * @param {!String} JSON representation of mutation.
   * @this Blockly.Block
   */
  this.JSONToMutation = function JSONToMutation (obj) {
    var mutation = {};
    for (var key in this.mutation_) {
      if (typeof this.mutation_[key] === "number") {
        mutation[key] = obj[key] && parseInt(obj[key], 10) || 0;
      } else {
        mutation[key] = obj[key] || "";
      }
    }
    this.update(mutation);
  };

  /**
   * Create XML to represent the number of dependents inputs.
   * @return {Element} XML storage element.
   * @this Blockly.Block
   */
  this.mutationToDom = function mutationToDom () {
    if (mutationDefault()) {
      return null;
    }
    var container = document.createElement('mutation');
    for (var key in this.mutation_) {
      container.setAttribute(key, this.mutation_[key]);
    }
    return container;
  };

  /**
   * Parse XML to restore the dependents inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  this.domToMutation = function domToMutation (xmlElement) {
    var mutation = {};
    for (var key in this.mutation_) {
      if (typeof this.mutation_[key] === "number") {
        mutation[key] = parseInt(xmlElement.getAttribute(key), 10) || 0;
      } else {
        mutation[key] = xmlElement.getAttribute(key) || "";
      }
    }
    this.update(mutation);
  };

  this.updatePart_ = function (mutation, key, inputKey, inputType, newConnections) {
    var newCount = mutation[key];

    // Add / remove inputs as necessary
    if (newCount > this.mutation_[key]) {
      for (var x = this.mutation_[key]; x < newCount; x++) {
        if (inputType === 'statement') {
          this.appendStatementInput(inputKey + x);
        } else {
          this.appendValueInput(inputKey + x);
        }
      }
    } else {
      for (var x = this.mutation_[key]; x > newCount; x--) {
        this.removeInput(inputKey + (x - 1));
      }
    }

    if (newConnections) {
      var input, inputName, connect = {};

      // Disconnections
      for (var x = 0; x < newCount; x++) {
        inputName = inputKey + x;
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
  };
}

function mutator_stack (colour, text, tooltip) {
  return {
    init: function() {
      this.setColour(colour);
      this.appendDummyInput()
          .appendField(text);
      this.appendStatementInput('STACK');

      if (tooltip) {
        this.setTooltip(tooltip);
      }

      this.contextMenu = false;
    }
  };
}

function mutator_child (colour, text, tooltip, isFinal) {
  return {
    init: function() {
      this.setColour(colour);
      this.appendDummyInput()
          .appendField(text);
      this.setPreviousStatement(true);

      if (!isFinal) {
        this.setNextStatement(true);
      }

      if (tooltip) {
        this.setTooltip(tooltip);
      }

      this.contextMenu = false;
    }
  };
}
