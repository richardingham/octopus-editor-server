// -*- mode: java; c-basic-offset: 2; -*-
/**
 * @license
 * @fileoverview Clickable field with flydown menu of machine getter blocks.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 * @author mail@richardingham.net (Richard Ingham)
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
var FieldMachineFlydown = function(name, displayLocation, changeHandler) {
  FieldMachineFlydown.super_.call(this, name, true, displayLocation,
      // rename all references to this global variable
      changeHandler)
};
util.inherits(FieldMachineFlydown, Blockly.FieldFlydown);

FieldMachineFlydown.prototype.fieldCSSClassName = 'blocklyFieldParameter';

FieldMachineFlydown.prototype.flyoutCSSClassName = 'blocklyFieldParameterFlydown';

/**
 * Block creation menu for global variables
 * Returns a list of two XML elements: a getter block for name and a setter block for this parameter field.
 *  @return {!Array.<string>} List of two XML elements.
 **/
FieldMachineFlydown.prototype.flydownBlocksXML_ = function() {
  var name, v = this.sourceBlock_.variable_;
  if (v) {
    name = v.getDisplay() + '@@' + v.getName();
  } else {
    name = Blockly.machineNamePrefix + " " + this.getText(); // global name for this parameter field.
  }
  var getterSetterXML =
      '<xml>' +
        '<block type="lexical_variable_get">' +
          '<field name="VAR">' +
            name +
          '</field>' +
        '</block>' +
      '</xml>';
  return getterSetterXML;
};

return FieldMachineFlydown

});
