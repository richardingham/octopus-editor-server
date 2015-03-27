/**
 * Prototype bindings for a global variable declaration block
 */
Blockly.Blocks['global_declaration'] = {
  // Global var defn
  category: 'Variables',
  //helpUrl: Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_HELPURL,
  init: function() {
    var block = this;
    this.fieldName_ = new Blockly.FieldGlobalFlydown(
      'name', //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_NAME,
      Blockly.FieldFlydown.DISPLAY_BELOW,
      this.rename_.bind(this)
    );

    this.setColour(Blockly.VARIABLES_CATEGORY_HUE);
    this.appendValueInput('VALUE')
        .appendField('initialise global') //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TITLE_INIT)
        .appendField(this.fieldName_, 'NAME')
        .appendField('to'); //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TO);
    this.setTooltip('Declare a global variable'); //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TOOLTIP);

    if (!this.isInFlyout) {
      this.rename_('name');
      this.fieldName_.setValue(this.variable_.getVarName());
    }
  },
  getVars: function() {
    return [this.fieldName_.getValue()];
  },
  // No external rename allowed??
  /*renameVar: function(oldName, newName, variable) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('NAME'))) {
      this.getFieldValue(newName, 'NAME');
    }
  },*/
  rename_: function (newName) {
    var oldName = this.fieldName_.getValue();
    if (oldName === newName && this.variable_) {
      return newName;
    }
    if (!this.variable_) {
      this.variable_ = Blockly.GlobalScope.addVariable(newName);
    } else {
      this.variable_.setName(newName);
    }
    return this.variable_.getVarName();
  },
  disposed: function () {
    if (this.variable_) {
      this.variable_.getScope().removeVariable(this.variable_.getVarName());
    }
  }
};


/**
 * Prototype bindings for a variable getter block
 */
Blockly.Blocks['lexical_variable_get'] = {
  // Variable getter.
  category: 'Variables',
  //helpUrl: Blockly.Msg.LANG_VARIABLES_GET_HELPURL,
  init: function() {
    this.setColour(Blockly.VARIABLES_CATEGORY_HUE);
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ");
    this.fieldVar_.setBlock(this);
    this.appendDummyInput()
        .appendField('get') //Blockly.Msg.LANG_VARIABLES_GET_TITLE_GET)
        .appendField(this.fieldVar_, 'VAR');
    this.setOutput(true, null);
    this.setTooltip(''); //Blockly.Msg.LANG_VARIABLES_GET_TOOLTIP);

    withVariableDropdown.call(this, this.fieldVar_, 'VAR');
  },
  variableChanged_: function (variable) {
    this.changeOutput(variable.getType());
  }
};


/**
 * Prototype bindings for a variable setter block
 */
Blockly.Blocks['lexical_variable_set'] = {
  // Variable setter.
  category: 'Variables',
  //helpUrl: Blockly.Msg.LANG_VARIABLES_SET_HELPURL,
  init: function() {
    this.setColour(Blockly.VARIABLES_CATEGORY_HUE);
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ", { readonly: false });
    this.fieldVar_.setBlock(this);
    this.appendValueInput('VALUE')
        .appendField('set') //Blockly.Msg.LANG_VARIABLES_SET_TITLE_SET)
        .appendField(this.fieldVar_, 'VAR')
        .appendField('to') //Blockly.Msg.LANG_VARIABLES_SET_TITLE_TO);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(''); //Blockly.Msg.LANG_VARIABLES_SET_TOOLTIP);

	  withVariableDropdown.call(this, this.fieldVar_, 'VAR');
  },
  variableChanged_: function (variable) {
    this.getInput('VALUE').setCheck(variable.getType());
  }
};


/**
 * Prototype bindings for a variable setter block
 */
Blockly.Blocks['lexical_variable_set_to'] = {
  // Variable setter.
  category: 'Variables',
  //helpUrl: Blockly.Msg.LANG_VARIABLES_SET_TO_HELPURL,
  init: function() {
    this.setColour(Blockly.VARIABLES_CATEGORY_HUE);
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ", { readonly: false });
    this.fieldVar_.setBlock(this);
    this.appendDummyInput('INPUT')
        .appendField('set') //Blockly.Msg.LANG_VARIABLES_SET_TITLE_SET)
        .appendField(this.fieldVar_, 'VAR')
        .appendField('to') //Blockly.Msg.LANG_VARIABLES_SET_TITLE_TO);
        .appendField('...', 'UNIT');
    this.appendDummyInput('BLANK')
        .appendField(new Blockly.FieldTextInput(''), 'VALUE')
        .setVisible(false);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(''); //Blockly.Msg.LANG_VARIABLES_SET_TOOLTIP);

	  withVariableDropdown.call(this, this.fieldVar_, 'VAR');
  },
  variableChanged_: function (variable) {
    var input = this.getInput('INPUT');
    var value = this.getFieldValue('VALUE');
    var type = variable.getType();
    var field, options;

    this.removeInput('BLANK', true);
    input.removeField('VALUE', true);
    input.removeField('UNIT', true);

    // Drop-down menu
    if (variable.flags.options) {
      options = [];
      for (var i = 0; i < variable.flags.options.length; i++) {
        options.push([variable.flags.options[i], variable.flags.options[i]]);
      }

      field = input.appendField(new Blockly.FieldDropdown(options), 'VALUE');

      if (variable.flags.options.indexOf(value) >= 0) {
        this.setFieldValue(value, 'VALUE');
      }

    // Number field
    } else if (type == "Number") {
      value = parseFloat(value);
      field = input.appendField(new Blockly.FieldTextInput(
        isNaN(value) ? '0' : String(value),
        Blockly.FieldTextInput.numberValidator
      ), 'VALUE');

    // Boolean field
    } else if (type == "Boolean") {
      options = [
        [Blockly.Msg.LOGIC_BOOLEAN_TRUE, 'TRUE'],
        [Blockly.Msg.LOGIC_BOOLEAN_FALSE, 'FALSE']
      ];

      field = input.appendField(new Blockly.FieldDropdown(options), 'VALUE');

      if (value) {
        this.setFieldValue('TRUE', 'VALUE');
      }

    // Text field
    } else {
      field = input.appendField(new Blockly.FieldTextInput(
        String(value)
      ), 'VALUE');
    }

    // Unit
    if (variable.flags.unit) {
      input.appendField(variable.flags.unit, 'UNIT');
    }
  }
};
