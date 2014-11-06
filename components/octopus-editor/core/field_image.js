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
 * @fileoverview Image field.  Used for titles, labels, etc.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

// goog.require('Blockly.Field');

var util = require('util');

module.exports = (function (Blockly) {

/**
 * Class for an image.
 * @param {string} src The URL of the image.
 * @param {number} width Width of the image.
 * @param {number} height Height of the image.
 * @param {?string} opt_alt Optional alt text for when block is collapsed.
 * @extends {Blockly.Field}
 * @constructor
 */
var FieldImage = function(src, width, height, opt_alt) {
  this.sourceBlock_ = null;
  // Ensure height and width are numbers.  Strings are bad at math.
  this.height_ = Number(height);
  this.width_ = Number(width);
  this.size_ = {height: this.height_ + 10, width: this.width_};
  this.text_ = opt_alt || '';
  // Build the DOM.
  var offsetY = 6 - Blockly.BlockSvg.FIELD_HEIGHT;
  this.fieldGroup_ = Blockly.createSvgElement('g', {}, null);
  this.imageElement_ = Blockly.createSvgElement('image',
      {'height': this.height_ + 'px',
       'width': this.width_ + 'px',
       'y': offsetY}, this.fieldGroup_);
  this.setValue(src);
  // TODO: test
  /*if (goog.userAgent.GECKO) {
    // Due to a Firefox bug which eats mouse events on image elements,
    // a transparent rectangle needs to be placed on top of the image.
    this.rectElement_ = Blockly.createSvgElement('rect',
        {'height': this.height_ + 'px',
         'width': this.width_ + 'px',
         'y': offsetY,
         'fill-opacity': 0}, this.fieldGroup_);
  }*/
};
util.inherits(FieldImage, Blockly.Field);

/**
 * Clone this FieldImage.
 * @return {!FieldImage} The result of calling the constructor again
 *   with the current values of the arguments used during construction.
 */
FieldImage.prototype.clone = function() {
  return new FieldImage(this.getSrc(), this.width_, this.height_,
      this.getText());
};

/**
 * Rectangular mask used by Firefox.
 * @type {Element}
 * @private
 */
FieldImage.prototype.rectElement_ = null;

/**
 * Editable fields are saved by the XML renderer, non-editable fields are not.
 */
FieldImage.prototype.EDITABLE = false;

/**
 * Install this text on a block.
 * @param {!Blockly.Block} block The block containing this text.
 */
FieldImage.prototype.init = function(block) {
  if (this.sourceBlock_) {
    throw 'Image has already been initialized once.';
  }
  this.sourceBlock_ = block;
  block.getSvgRoot().appendChild(this.fieldGroup_);

  // Configure the field to be transparent with respect to tooltips.
  var topElement = this.rectElement_ || this.imageElement_;
  topElement.tooltip = this.sourceBlock_;
  Blockly.Tooltip.bindMouseEvents(topElement);
};

/**
 * Dispose of all DOM objects belonging to this text.
 */
FieldImage.prototype.dispose = function() {
  var node = this.fieldGroup_
  if (node && node.parentNode) node.parentNode.removeChild(node);
  this.fieldGroup_ = null;
  this.imageElement_ = null;
  this.rectElement_ = null;
};

/**
 * Change the tooltip text for this field.
 * @param {string|!Element} newTip Text for tooltip or a parent element to
 *     link to for its tooltip.
 */
FieldImage.prototype.setTooltip = function(newTip) {
  var topElement = this.rectElement_ || this.imageElement_;
  topElement.tooltip = newTip;
};

/**
 * Get the source URL of this image.
 * @return {string} Current text.
 * @override
 */
FieldImage.prototype.getValue = function() {
  return this.src_;
};

/**
 * Set the source URL of this image.
 * @param {?string} src New source.
 * @override
 */
FieldImage.prototype.setValue = function(src) {
  if (src === null) {
    // No change if null.
    return;
  }
  this.src_ = src;
  this.imageElement_.setAttributeNS('http://www.w3.org/1999/xlink',
      'xlink:href', util.isString(src) ? src : '');
};

/**
 * Set the alt text of this image.
 * @param {?string} alt New alt text.
 * @override
 */
FieldImage.prototype.setText = function(alt) {
  if (alt === null) {
    // No change if null.
    return;
  }
  this.text_ = alt;
};

return FieldImage;

});

