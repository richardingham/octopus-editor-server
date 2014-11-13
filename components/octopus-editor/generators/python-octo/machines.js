function machineBlockGenerator (mod, cls) {
  return function (block) {
    var name = Blockly.PythonOcto.getVariableName_(block.variable_);
    var alias = (block.variable_ ? block.variable_.getVarName() : "_");
    var conn = Blockly.PythonOcto.valueToCode(block, 'CONNECTION',
        Blockly.PythonOcto.ORDER_NONE) || 'dummy()';
    Blockly.PythonOcto.definitions_['import_' + mod] = 'from octopus.manufacturer import ' + mod;
    return [name, ' = ', mod, '.', cls, '(', conn, ', alias = ', Blockly.PythonOcto.quote_(alias), ')'].join('');
  };
};

Blockly.PythonOcto['machine_vapourtec_R2R4'] = machineBlockGenerator('vapourtec', 'R2R4');
Blockly.PythonOcto['machine_knauer_K120'] = machineBlockGenerator('knauer', 'K120');
Blockly.PythonOcto['machine_knauer_S100'] = machineBlockGenerator('knauer', 'S100');
Blockly.PythonOcto['machine_vici_multivalve'] = machineBlockGenerator('vici', 'MultiValve');
