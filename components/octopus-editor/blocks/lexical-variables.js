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

    this.setColour(330);
    this.appendValueInput('VALUE')
        .appendField('initialise global') //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TITLE_INIT)
        .appendField(this.fieldName_, 'NAME')
        .appendField('to'); //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TO);
    this.setTooltip('Declare a global variable'); //Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TOOLTIP);

    if (!this.isInFlyout) {
      this.rename_('name');
      this.fieldName_.setValue(this.variable_.getVarName());

      this.fieldName_.on("changed", function (name) {
        block.workspace.startEmitTransaction();
        block.workspaceEmit("block-set-field-value", { id: block.id, field: 'NAME', value: name });
        Blockly.Variable.announceRenamed(block.variable_.getName());
        block.workspace.completeEmitTransaction();
      });
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
  //typeblock: [{ translatedName: Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TITLE_INIT }]
};


/**
 * Prototype bindings for a variable getter block
 */
Blockly.Blocks['lexical_variable_get'] = {
  // Variable getter.
  category: 'Variables',
  //helpUrl: Blockly.Msg.LANG_VARIABLES_GET_HELPURL,
  init: function() {
    this.setColour(330);
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ");
    this.fieldVar_.setBlock(this);
    this.appendDummyInput()
        .appendField('get') //Blockly.Msg.LANG_VARIABLES_GET_TITLE_GET)
        .appendField(this.fieldVar_, 'VAR');
    this.setOutput(true, null);
    this.setTooltip(''); //Blockly.Msg.LANG_VARIABLES_GET_TOOLTIP);
    //this.errors = [{name:"checkIsInDefinition"},{name:"checkDropDownContainsValidValue",dropDowns:["VAR"]}];

    withVariableDropdown.call(this, this.fieldVar_, 'VAR');
  },
  setVarType_: function (type) {
    this.changeOutput(type);
  }
  //typeblock: [{ translatedName: Blockly.Msg.LANG_VARIABLES_GET_TITLE_GET + Blockly.Msg.LANG_VARIABLES_VARIABLE }]
};


/**
 * Prototype bindings for a variable setter block
 */
Blockly.Blocks['lexical_variable_set'] = {
  // Variable setter.
  category: 'Variables',
  //helpUrl: Blockly.Msg.LANG_VARIABLES_SET_HELPURL, // *** [lyn, 11/10/12] Fix this
  init: function() {
    this.setColour(330); //Blockly.VARIABLE_CATEGORY_HUE);
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ", true);
    this.fieldVar_.setBlock(this);
    this.appendValueInput('VALUE')
        .appendField('set') //Blockly.Msg.LANG_VARIABLES_SET_TITLE_SET)
        .appendField(this.fieldVar_, 'VAR')
        .appendField('to') //Blockly.Msg.LANG_VARIABLES_SET_TITLE_TO);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(''); //Blockly.Msg.LANG_VARIABLES_SET_TOOLTIP);
    //this.errors = [{name:"checkIsInDefinition"},{name:"checkDropDownContainsValidValue",dropDowns:["VAR"]}];

	  withVariableDropdown.call(this, this.fieldVar_, 'VAR');
  },
  setVarType_: function (type) {
    this.getInput('VALUE').setCheck(type);
  }
  //typeblock: [{ translatedName: Blockly.Msg.LANG_VARIABLES_SET_TITLE_SET + Blockly.Msg.LANG_VARIABLES_VARIABLE }]
};
