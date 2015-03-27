
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
    if (Blockly.Names.equals(name, field.getVariableName())) {
      var attributeName = field.getAttributeName();
      if (attributeName !== '') {
        name += '::' + attributeName;
      }
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

function withMutation (mutationOptions) {
  this.mutation_ = {};
  var defaultMutation = {};

  var mutationParts = mutationOptions.parts || [];
  var mutationTypeMap = {};
  var preUpdate = mutationOptions.preUpdate || function () {};
  var postUpdate = mutationOptions.postUpdate || function () {};

  var part;

  // Create this.mutation_, initially with defaults.
  var editorBlocks = [];
  for (var i = 0, m = mutationParts.length; i < m; i++) {
    part = mutationParts[i];
    this.mutation_[part.name] = 0;
    defaultMutation[part.name] = part.default;

    if (!Array.isArray(part.input)) {
      part.input = [part.input];
    }

    part.counterStart = parseInt(part.counterStart) || 0;

    part.editor.block = part.editor.block || this.type + '_mut_item_' + part.name;
    mutationTypeMap[part.editor.block] = i;
    editorBlocks.push(part.editor.block);
  }

  mutationOptions.editor.block = mutationOptions.editor.block || this.type + '_mut_container';

  // Create mutation editor blocks
  if (typeof Blockly.Blocks[mutationOptions.editor.block] === 'undefined') {
    Blockly.Blocks[mutationOptions.editor.block] = mutator_stack(
      this.getColour(),
      mutationOptions.editor.text || '',
      mutationOptions.editor.tooltip || ''
    );

    for (var i = 0, m = mutationParts.length; i < m; i++) {
      part = mutationParts[i];

      Blockly.Blocks[part.editor.block] = mutator_child(
        this.getColour(),
        part.editor.text || '',
        part.editor.tooltip || '',
        part.isFinal
      );
    }
  }

  // Set up mutator
  this.setMutator(new Blockly.Mutator(editorBlocks));

  // Function to check whether the mutation has changed from
  // the defaults. Used in mutationToDom()
  function mutationDefault () {
    var part;
    for (var i = 0, m = mutationParts.length; i < m; i++) {
      part = mutationParts[i];
      if (this.mutation_[part.name] !== part.default) {
        return false;
      }
    }
    return true;
  }

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
    if (mutationDefault.call(this)) {
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

  function getInputName (name, part, number) {
    return name + (part.isFinal ? '' : number + part.counterStart);
  }

  function updatePart (mutation, part, newConnections) {
    var newCount = mutation[part.name];
    var input, inputOptions;

    // Add / remove inputs as necessary
    if (newCount > this.mutation_[part.name]) {
      for (var x = this.mutation_[part.name]; x < newCount; x++) {
        for (var i = 0, m = part.input.length; i < m; i++) {
          inputOptions = part.input[i];

          if (inputOptions.type === 'statement') {
            input = this.appendStatementInput(getInputName(inputOptions.name, part, x));
          } else {
            input = this.appendValueInput(getInputName(inputOptions.name, part, x));
            if (inputOptions.check) {
              input.setCheck(inputOptions.check);
            }
          }
          if (inputOptions.align) {
            input.setAlign(inputOptions.align);
          }
          if (inputOptions.text) {
            input.appendField(inputOptions.text);
          }
        }
      }
    } else {
      for (var x = this.mutation_[part.name]; x > newCount; x--) {
        for (var i = 0, m = part.input.length; i < m; i++) {
          this.removeInput(getInputName(part.input[i].name, part, x - 1));
        }
      }
    }

    if (newConnections) {
      var inputName, connect = {};

      // Disconnections
      for (var x = 0; x < newCount; x++) {
        for (var i = 0, m = part.input.length; i < m; i++) {
          inputOptions = part.input[i];
          inputName = getInputName(inputOptions.name, part, x)
          if (newConnections[inputName] != this.connections_[inputName]) {
            input = this.getInput(inputName);
            if (input && input.connection.targetConnection) {
              input.connection.targetBlock().setParent();
            }
            connect[inputName] = newConnections[inputName];
          }
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
  }

  this.update = function (mutation, newConnections) {
    var oldMutation = this.mutation_;
    preUpdate.call(this, mutation, oldMutation);

    var part;
    for (var i = 0, m = mutationParts.length; i < m; i++) {
      part = mutationParts[i];
      updatePart.call(this, mutation, part, newConnections);
    }
    this.mutation_ = mutation;

    postUpdate.call(this, mutation, oldMutation);
  };

  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  this.decompose = function (workspace) {
    var containerBlock = Blockly.Block.obtain(
      workspace,
      mutationOptions.editor.block
    );
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;

    var part;
    for (var i = 0, m = mutationParts.length; i < m; i++) {
      part = mutationParts[i];

      for (var x = 0; x < this.mutation_[part.name]; x++) {
        var itemBlock = Blockly.Block.obtain(workspace, part.editor.block);
        itemBlock.initSvg();
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
      }
    }

    return containerBlock;
  };

  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  this.compose = function(containerBlock) {
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    var mutation = {}, connections = {};
    var part;

    // Set empty mutation, store types map.
    for (var i = 0, m = mutationParts.length; i < m; i++) {
      part = mutationParts[i];
      mutation[part.name] = 0;
    }

    // Calculate changes
    while (clauseBlock) {
      if (typeof mutationTypeMap[clauseBlock.type] === 'undefined') {
        throw 'Unknown block type.';
      }
      part = mutationParts[mutationTypeMap[clauseBlock.type]];

      for (var i = 0, m = part.input.length; i < m; i++) {
        if (clauseBlock.connection_) {
          connections[getInputName(
            part.input[i].name,
            part,
            mutation[part.name]
          )] = clauseBlock.connection_[part.input[i].name];
        }
      }
      mutation[part.name]++;

      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }

    this.update(mutation, connections);
  };

  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  this.saveConnections = function (containerBlock) {
    var part, input, inputName, inputOptions;
    var counters = {}

    this.connections_ = {};

    // Store types map.
    for (var i = 0, m = mutationParts.length; i < m; i++) {
      part = mutationParts[i];
      counters[part.name] = 0;
    }

    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    while (clauseBlock) {
      part = mutationParts[mutationTypeMap[clauseBlock.type]];

      if (!part) {
        throw 'Unknown block type.';
      }

      clauseBlock.connection_ = {};
      for (var i = 0, m = part.input.length; i < m; i++) {
        inputOptions = part.input[i];
        inputName = getInputName(inputOptions.name, part, counters[part.name]);
        input = this.getInput(inputName);
        clauseBlock.connection_[inputOptions.name] = input && input.connection.targetConnection;
        this.connections_[inputName] = clauseBlock.connection_[inputOptions.name];
      }
      counters[part.name]++;

      clauseBlock = clauseBlock.nextConnection &&
        clauseBlock.nextConnection.targetBlock();
    }
  };

  // Create default mutation
  this.JSONToMutation(defaultMutation);
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
