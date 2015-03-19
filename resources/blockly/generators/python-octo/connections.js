Blockly.PythonOcto['connection_tcp'] = function (block) {
  var host = block.getFieldValue('HOST');
  var port = parseInt(block.getFieldValue('PORT'));
  var code = 'tcp(' + Blockly.PythonOcto.quote_(host) + ', ' + port + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['connection_serial'] = function(block) {
  var port = block.getFieldValue('PORT');
  var baud = parseInt(block.getFieldValue('BAUD'));
  var code = 'serial(' + Blockly.PythonOcto.quote_(port) + ', baudrate = ' + baud + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['connection_phidget'] = function(block) {
  Blockly.PythonOcto.definitions_['import_transport_basic_phidget'] = 'from octopus.transport.basic import Phidget';
  var id = parseInt(block.getFieldValue('ID'));
  var code = 'Phidget(' + id + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['connection_cvcamera'] = function(block) {
  Blockly.PythonOcto.definitions_['import_image_source'] = 'from octopus.image.source import cv_webcam';
  var id = parseInt(block.getFieldValue('ID'));
  var code = 'cv_webcam(' + id + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['connection_gsioc'] = function(block) {
  var name = Blockly.PythonOcto.getVariableName_(block.getVariable());
  var id = parseInt(block.getFieldValue('ID'));
  var code = name + '.gsioc(' + id + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};
