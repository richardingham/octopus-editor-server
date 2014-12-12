/**
 * @fileoverview Generating Python-Octo for control blocks.
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';

function stringFill (x, n) { 
  var s = ''; 
  for (;;) { 
    if (n & 1) s += x; 
    n >>= 1; 
    if (n) x += x; 
    else break; 
  } 
  return s; 
}

function indent (code, times) {
  var i = Blockly.PythonOcto.INDENT;
  if (times !== undefined) {
    if (times < 1) return code;
    i = stringFill(i, times);
  }
  return Blockly.PythonOcto.prefixLines(code, i)
}

Blockly.PythonOcto['controls_if'] = function(block) {
  // If/elseif/else condition.
  var n = 0;
  var argument = Blockly.PythonOcto.valueToCode(block, 'IF' + n,
      Blockly.PythonOcto.ORDER_NONE) || 'False';
  var branch = Blockly.PythonOcto.statementToCode(block, 'DO' + n) || '[]';
  var code = 'do_if(' + argument + ', \n';
  code += indent(branch);
  
  for (n = 1; n <= block.elseifCount_; n++) {
    argument = Blockly.PythonOcto.valueToCode(block, 'IF' + n,
        Blockly.PythonOcto.ORDER_NONE) || 'False';
    branch = Blockly.PythonOcto.statementToCode(block, 'DO' + n) || '[]';
    code += ',\n';
    code += indent('do_if(' + argument + ', \n' + indent(branch), n);
  }
  if (block.elseCount_) {
    branch = Blockly.PythonOcto.statementToCode(block, 'ELSE') || '[]';
    code += ',\n' + indent(indent(branch) + '\n)', n - 1);
  } else {
    code += '\n' + indent(')', n - 1);
  }
  for (; n > 1; n--) {
    code += '\n' + indent(')', n - 2);
  }
  return code;
};

Blockly.PythonOcto['controls_wait'] = function(block) {
  var argument = Blockly.PythonOcto.valueToCode(block, 'TIME',
      Blockly.PythonOcto.ORDER_NONE) || '0';
  var code = 'wait(' + argument + ')';
  return code;
};

Blockly.PythonOcto['controls_wait_until'] = function(block) {
  var argument = Blockly.PythonOcto.valueToCode(block, 'CONDITION',
      Blockly.PythonOcto.ORDER_NONE) || 'True';
  var code = 'wait_until(' + argument + ')';
  return code;
};

Blockly.PythonOcto['controls_run'] = function(block) {
  var later = block.getFieldValue('MODE') === 'PAUSED';
  var branch = Blockly.PythonOcto.statementToCode(block, 'STACK') || 'sequence()';
  var code = 'run' + (later ? '_later' : '') + '(' + branch + ')';
  return code;
};

Blockly.PythonOcto['controls_parallel'] = function(block) {
  var code = [];
  var block;

  for (var n = 1; n <= block.mutation_.stacks; n++) {
    block = Blockly.PythonOcto.statementToCode(block, 'STACK' + n);
    if (block) {
      code.push(block);
    }
  }

  return 'parallel(' + (code.length ? '\n' : '') +
      indent(code.join(',\n')) + (code.length ? '\n' : '') + ')';
};

Blockly.PythonOcto['controls_dependents'] = function(block) {
  var code = [];
  var branch = Blockly.PythonOcto.statementToCode(block, 'STACK') || 'sequence()';

  var depCode;
  for (var n = 0; n < block.mutation_.dependents; n++) {
    depCode = Blockly.PythonOcto.valueToCode(block, 'DEP' + n,
        Blockly.PythonOcto.ORDER_NONE);
    if (depCode) {
      code.push(depCode);
    }
  }

  var n = code.length ? '\n' : '';
  code = 'with_dependents(' + branch + ', [' + n +
      indent(code.join(',\n')) + n + '])';
  return code;
};

Blockly.PythonOcto['controls_bind'] = function(block) {
  Blockly.PythonOcto.definitions_['import_sequence_control'] = 'from octopus.sequence import control';

  var value = Blockly.PythonOcto.valueToCode(block, 'VALUE',
      Blockly.PythonOcto.ORDER_NONE) || 'False';
  var name = Blockly.PythonOcto.getVariableName_(block.getVariable());
  var code = 'control.Bind(' + name + ', ' + value + ')';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};

Blockly.PythonOcto['controls_statemonitor'] = function(block) {
  Blockly.PythonOcto.definitions_['import_sequence_control'] = 'from octopus.sequence import control';

  var code = [];
  var triggerBranch = Blockly.PythonOcto.statementToCode(block, 'TRIGGER') || 'sequence()';
  var resetBranch = Blockly.PythonOcto.statementToCode(block, 'RESET') || 'sequence()';

  var testCode;
  for (var n = 0; n < block.mutation_.tests; n++) {
    testCode = Blockly.PythonOcto.valueToCode(block, 'TEST' + n,
        Blockly.PythonOcto.ORDER_NONE);
    if (testCode) {
      code.push(testCode);
    }
  }

  var n = code.length ? '\n' : '';
  code = 'control.StateMonitor(\n' + 
    indent('tests = [' + n + indent(code.join(',\n')) + n + '],\n' +
    'trigger_step = ' + triggerBranch + ',\n' + 
    'reset_step = ' + resetBranch) + 
    '\n)';
  return [code, Blockly.PythonOcto.ORDER_FUNCTION_CALL];
};
