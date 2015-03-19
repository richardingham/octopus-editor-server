// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2013-2014 MIT, All rights reserved
// Released under the MIT License https://raw.github.com/mit-cml/app-inventor/master/mitlicense.txt
/**
 * @license
 * @fileoverview Clickable field with flydown menu of global getter and setter blocks.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */

'use strict';

var util = require('util');

module.exports = (function (Blockly) {

/**
 * Class for a clickable global variable declaration field.
 * @param {string} text The initial parameter name in the field.
 * @extends {Blockly.Field}
 * @constructor
 */
var FieldGlobalFlydown = function(name, displayLocation, changeHandler) {
  FieldGlobalFlydown.super_.call(this, name, true, displayLocation, changeHandler);
};
util.inherits(FieldGlobalFlydown, Blockly.FieldFlydown);

FieldGlobalFlydown.prototype.fieldCSSClassName = 'blocklyFieldParameter';

FieldGlobalFlydown.prototype.flyoutCSSClassName = 'blocklyFieldParameterFlydown';

/**
 * Block creation menu for global variables
 * Returns a list of two XML elements: a getter block for name and a setter block for this parameter field.
 *  @return {!Array.<string>} List of two XML elements.
 **/
FieldGlobalFlydown.prototype.flydownBlocksXML_ = function() {
  var name, v = this.sourceBlock_.variable_;
  if (v) {
    name = v.getDisplay() + '@@' + v.getName();
  } else {
    name = Blockly.globalNamePrefix + " " + this.getText(); // global name for this parameter field.
  }
  var getterSetterXML =
      '<xml>' +
        '<block type="lexical_variable_get">' +
          '<field name="VAR">' +
            name +
          '</field>' +
        '</block>' +
        '<block type="lexical_variable_set">' +
          '<field name="VAR">' +
            name +
          '</field>' +
        '</block>' +
      '</xml>';
  return getterSetterXML;
};

return FieldGlobalFlydown;

});
