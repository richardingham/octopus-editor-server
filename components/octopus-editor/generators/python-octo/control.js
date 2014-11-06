/*
 * Control blocks.
 * ON / when
 * [ PARALLEL ]
 * LOOP
 * IF
 */
 
 /*
  * Timing
  * WAIT
  * WAIT UNTIL
  */
  
 /*
  * Misc
  * LOG
  */
 
 /*
  * Variables
  * SET
  * GET
  */
 
 /*
  * Procedures
  * DEF
  * CALL
  */
 
/**
 * @fileoverview Generating Python-Octo for control blocks.
 * @author mail@richardingham.net (Richard Ingham)
 */
'use strict';


Blockly.PythonOcto['controls_if'] = function(block) {
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

