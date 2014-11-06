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
 
 // TODO: implement with https://github.com/josedvq/colpick-jQuery-Color-Picker/

/**
 * @fileoverview Colour input field.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

// goog.require('Blockly.Field');
// goog.require('goog.ui.ColorPicker');

var util = require('util');

module.exports = (function (Blockly) {

/**
 * Class for a colour input field.
 * @param {string} colour The initial colour in '#rrggbb' format.
 * @param {Function} opt_changeHandler A function that is executed when a new
 *     colour is selected.  Its sole argument is the new colour value.  Its
 *     return value becomes the selected colour, unless it is undefined, in
 *     which case the new colour stands, or it is null, in which case the change
 *     is aborted.
 * @extends {Blockly.Field}
 * @constructor
 */
var FieldColour = function(colour, opt_changeHandler) {
  FieldColour.super_.call(this, '\u00A0\u00A0\u00A0');

  this.changeHandler_ = opt_changeHandler;
  this.borderRect_.style['fillOpacity'] = 1;
  // Set the initial state.
  this.setValue(colour);
};
util.inherits(FieldColour, Blockly.Field);

/**
 * Clone this FieldColour.
 * @return {!FieldColour} The result of calling the constructor again
 *   with the current values of the arguments used during construction.
 */
FieldColour.prototype.clone = function() {
  return new FieldColour(this.getValue(), this.changeHandler_);
};

/**
 * Mouse cursor style when over the hotspot that initiates the editor.
 */
FieldColour.prototype.CURSOR = 'default';

/**
 * Close the colour picker if this input is being deleted.
 */
FieldColour.prototype.dispose = function() {
  Blockly.WidgetDiv.hideIfOwner(this);
  FieldColour.super_.prototype.dispose.call(this);
};

/**
 * Return the current colour.
 * @return {string} Current colour in '#rrggbb' format.
 */
FieldColour.prototype.getValue = function() {
  return this.colour_;
};

/**
 * Set the colour.
 * @param {string} colour The new colour in '#rrggbb' format.
 */
FieldColour.prototype.setValue = function(colour) {
  this.colour_ = colour;
  this.borderRect_.style.fill = colour;
  if (this.sourceBlock_ && this.sourceBlock_.rendered) {
    // Since we're not re-rendering we need to explicitly call
    // Blockly.Realtime.blockChanged()
    Blockly.Realtime.blockChanged(this.sourceBlock_);
    this.sourceBlock_.workspace.fireChangeEvent();
  }
};

/**
 * An array of colour strings for the palette.
 * See bottom of this page for the default:
 * http://docs.closure-library.googlecode.com/git/closure_goog_ui_colorpicker.js.source.html
 * @type {!Array.<string>}
 */
FieldColour.COLOURS = goog.ui.ColorPicker.SIMPLE_GRID_COLORS;

/**
 * Number of columns in the palette.
 */
FieldColour.COLUMNS = 7;

/**
 * Create a palette under the colour field.
 * @private
 */
FieldColour.prototype.showEditor_ = function() {
  Blockly.WidgetDiv.show(this, FieldColour.widgetDispose_);
  // Create the palette using Closure.
  var picker = new goog.ui.ColorPicker();
  picker.setSize(FieldColour.COLUMNS);
  picker.setColors(FieldColour.COLOURS);

  // Position the palette to line up with the field.
  // Record windowSize and scrollOffset before adding the palette.
  var windowSize = goog.dom.getViewportSize();
  var scrollOffset = goog.style.getViewportPageOffset(document);
  var xy = Blockly.getAbsoluteXY_(/** @type {!Element} */ (this.borderRect_));
  var borderBBox = this.borderRect_.getBBox();
  var div = Blockly.WidgetDiv.DIV;
  picker.render(div);
  picker.setSelectedColor(this.getValue());
  // Record paletteSize after adding the palette.
  var paletteSize = goog.style.getSize(picker.getElement());

  // Flip the palette vertically if off the bottom.
  if (xy.y + paletteSize.height + borderBBox.height >=
      windowSize.height + scrollOffset.y) {
    xy.y -= paletteSize.height - 1;
  } else {
    xy.y += borderBBox.height - 1;
  }
  if (Blockly.RTL) {
    xy.x += borderBBox.width;
    xy.x -= paletteSize.width;
    // Don't go offscreen left.
    if (xy.x < scrollOffset.x) {
      xy.x = scrollOffset.x;
    }
  } else {
    // Don't go offscreen right.
    if (xy.x > windowSize.width + scrollOffset.x - paletteSize.width) {
      xy.x = windowSize.width + scrollOffset.x - paletteSize.width;
    }
  }
  Blockly.WidgetDiv.position(xy.x, xy.y, windowSize, scrollOffset);

  // Configure event handler.
  var thisObj = this;
  FieldColour.changeEventKey_ = goog.events.listen(picker,
      goog.ui.ColorPicker.EventType.CHANGE,
      function(event) {
        var colour = event.target.getSelectedColor() || '#000000';
        Blockly.WidgetDiv.hide();
        if (thisObj.changeHandler_) {
          // Call any change handler, and allow it to override.
          var override = thisObj.changeHandler_(colour);
          if (override !== undefined) {
            colour = override;
          }
        }
        if (colour !== null) {
          thisObj.setValue(colour);
        }
      });
};

/**
 * Hide the colour palette.
 * @private
 */
FieldColour.widgetDispose_ = function() {
  if (FieldColour.changeEventKey_) {
    goog.events.unlistenByKey(FieldColour.changeEventKey_);
  }
};

return FieldColour;

});
