function machineBlockGenerator (smod, mod, cls) {
  return function (block) {
    var name = Blockly.PythonOcto.getVariableName_(block.variable_);
    var alias = (block.variable_ ? block.variable_.getVarName() : "_");
    var conn = Blockly.PythonOcto.valueToCode(block, 'CONNECTION',
        Blockly.PythonOcto.ORDER_NONE) || 'dummy()';
    Blockly.PythonOcto.definitions_['import_' + smod + '_' + mod] = 'from ' + smod + ' import ' + mod;

    var attributes = []
    if (block.mutation) {
      var opt, options = block.machineOptions || [];
      for (var i = 0, max = options.length; i < max; i++) {
        opt = options[i];
        if (opt.multi) {
          attributes.push(opt.name + ' = ' + JSON.stringify(block.mutation[opt.name] || []));
        } else {
          attributes.push(opt.name + ' = ' + (block.mutation[opt.name] || (opt.type === "Number" ? 0 : '""')));
        }
      }
    }

    return [
      name, ' = ', mod, '.', cls, '(', conn,
      attributes.length ? ', ' : '', attributes.join(', '),
      ', alias = ', Blockly.PythonOcto.quote_(alias), ')'
    ].join('');
  };
};

Blockly.PythonOcto['machine_vapourtec_R2R4'] = machineBlockGenerator('octopus.manufacturer', 'vapourtec', 'R2R4');
Blockly.PythonOcto['machine_knauer_K120'] = machineBlockGenerator('octopus.manufacturer', 'knauer', 'K120');
Blockly.PythonOcto['machine_knauer_S100'] = machineBlockGenerator('octopus.manufacturer', 'knauer', 'S100');
Blockly.PythonOcto['machine_vici_multivalve'] = machineBlockGenerator('octopus.manufacturer', 'vici', 'MultiValve');
Blockly.PythonOcto['machine_mt_icir'] = machineBlockGenerator('octopus.manufacturer', 'mt', 'iCIR');
Blockly.PythonOcto['machine_wpi_aladdin'] = machineBlockGenerator('octopus.manufacturer', 'wpi', 'Aladdin');
Blockly.PythonOcto['machine_phidgets_phsensor'] = machineBlockGenerator('octopus.manufacturer', 'phidgets', 'PHSensor');
Blockly.PythonOcto['machine_singletracker'] = machineBlockGenerator('octopus.image', 'tracker', 'SingleBlobTracker');
Blockly.PythonOcto['machine_multitracker'] = machineBlockGenerator('octopus.image', 'tracker', 'MultiBlobTracker');
Blockly.PythonOcto['machine_imageprovider'] = machineBlockGenerator('_fixme_', 'image', 'ImageProvider');
Blockly.PythonOcto['machine_omega_hh306a'] = machineBlockGenerator('octopus.manufacturer', 'omega', 'HH306A');
Blockly.PythonOcto['machine_harvard_phd2000'] = machineBlockGenerator('octopus.manufacturer', 'harvard', 'PHD2000');
