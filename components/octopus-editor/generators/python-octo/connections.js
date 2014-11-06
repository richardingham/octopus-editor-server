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
