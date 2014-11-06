/**
 * @license
 * MIT
 */

'use strict';


/**
 * Python code generator.
 * @type !Blockly.Generator
 */
Blockly.PythonOcto = new Blockly.Generator('PythonOcto');

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.PythonOcto.addReservedWords(
    // import keyword
    // print ','.join(keyword.kwlist)
    // http://docs.PythonOcto.org/reference/lexical_analysis.html#keywords
    'and,as,assert,break,class,continue,def,del,elif,else,except,exec,finally,for,from,global,if,import,in,is,lambda,not,or,pass,print,raise,return,try,while,with,yield,' +
    //http://docs.PythonOcto.org/library/constants.html
    'True,False,None,NotImplemented,Ellipsis,__debug__,quit,exit,copyright,license,credits,' +
    // http://docs.PythonOcto.org/library/functions.html
    'abs,divmod,input,open,staticmethod,all,enumerate,int,ord,str,any,eval,isinstance,pow,sum,basestring,execfile,issubclass,print,super,bin,file,iter,property,tuple,bool,filter,len,range,type,bytearray,float,list,raw_input,unichr,callable,format,locals,reduce,unicode,chr,frozenset,long,reload,vars,classmethod,getattr,map,repr,xrange,cmp,globals,max,reversed,zip,compile,hasattr,memoryview,round,__import__,complex,hash,min,set,apply,delattr,help,next,setattr,buffer,dict,hex,object,slice,coerce,dir,id,oct,sorted,intern');

/**
 * Order of operation ENUMs.
 * http://docs.PythonOcto.org/reference/expressions.html#summary
 */
Blockly.PythonOcto.ORDER_ATOMIC = 0;            // 0 "" ...
Blockly.PythonOcto.ORDER_COLLECTION = 1;        // tuples, lists, dictionaries
Blockly.PythonOcto.ORDER_STRING_CONVERSION = 1; // `expression...`
Blockly.PythonOcto.ORDER_MEMBER = 2;            // . []
Blockly.PythonOcto.ORDER_FUNCTION_CALL = 2;     // ()
Blockly.PythonOcto.ORDER_EXPONENTIATION = 3;    // **
Blockly.PythonOcto.ORDER_UNARY_SIGN = 4;        // + -
Blockly.PythonOcto.ORDER_BITWISE_NOT = 4;       // ~
Blockly.PythonOcto.ORDER_MULTIPLICATIVE = 5;    // * / // %
Blockly.PythonOcto.ORDER_ADDITIVE = 6;          // + -
Blockly.PythonOcto.ORDER_BITWISE_SHIFT = 7;     // << >>
Blockly.PythonOcto.ORDER_BITWISE_AND = 8;       // &
Blockly.PythonOcto.ORDER_BITWISE_XOR = 9;       // ^
Blockly.PythonOcto.ORDER_BITWISE_OR = 10;       // |
Blockly.PythonOcto.ORDER_RELATIONAL = 11;       // in, not in, is, is not,
                                                //     <, <=, >, >=, <>, !=, ==
Blockly.PythonOcto.ORDER_LOGICAL_NOT = 12;      // not
Blockly.PythonOcto.ORDER_LOGICAL_AND = 13;      // and
Blockly.PythonOcto.ORDER_LOGICAL_OR = 14;       // or
Blockly.PythonOcto.ORDER_CONDITIONAL = 15;      // if else
Blockly.PythonOcto.ORDER_LAMBDA = 16;           // lambda
Blockly.PythonOcto.ORDER_NONE = 99;             // (...)

/**
 * Initialise the database of variable names.
 */
Blockly.PythonOcto.init = function() {
  // Create a dictionary of definitions to be printed before the code.
  Blockly.PythonOcto.definitions_ = Object.create(null);
  // Create a dictionary mapping desired function names in definitions_
  // to actual function names (to avoid collisions with user functions).
  Blockly.PythonOcto.functionNames_ = Object.create(null);

  if (!Blockly.PythonOcto.variableDB_) {
    Blockly.PythonOcto.variableDB_ =
        new Blockly.Names(Blockly.PythonOcto.RESERVED_WORDS_);
  } else {
    Blockly.PythonOcto.variableDB_.reset();
  }

  //var defvars = [];
  //var variables = Blockly.Variables.allVariables();
 // for (var x = 0; x < variables.length; x++) {
  //  defvars[x] = Blockly.PythonOcto.variableDB_.getName(variables[x],
  //      Blockly.Variables.NAME_TYPE) + ' = None';
  //}
  //Blockly.PythonOcto.definitions_['variables'] = defvars.join('\n');
};

// Blockly.PythonOcto.generateMachines = function () {
	// (Blockly.octopusMachines || []).forEach(function (machine) {
		// var conn = '';
		// if (!machine.connection || machine.connection.type == 'dummy') {
			// conn = 'dummy()';
		// } else if (machine.connection.type == 'tcp') {
			// conn = 'tcp()';
		// } else if (machine.connection.type == 'serial') {
			// conn = 'serial()';
		// }
		// Blockly.PythonOcto.definitions_['machines'].push(
			// machine.var_name + ' = ' + machine.type + '(' + conn + ')'
		// );
	// });
// };

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.PythonOcto.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var imports = [];
  var definitions = [];
  //var machines = [];
  for (var name in Blockly.PythonOcto.definitions_) {
    var def = Blockly.PythonOcto.definitions_[name];
	if (def.match && def.match(/^(from\s+\S+\s+)?import\s+\S+/)) {
      imports.push(def);
    } else {
      if (def.join) {
		def = def.join("\n");
	  }
	  definitions.push(def);
    }
  }
  var allDefs = imports.join('\n') + '\n\n' + definitions.join('\n\n');
  return allDefs.replace(/\n\n+/g, '\n\n').replace(/\n*$/, '\n\n\n') + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.PythonOcto.scrubNakedValue = function(line) {
  return line + '\n';
};

/**
 * Encode a string as a properly escaped Python string, complete with quotes.
 * @param {string} string Text to encode.
 * @return {string} Python string.
 * @private
 */
Blockly.PythonOcto.quote_ = function(string) {
  // TODO: This is a quick hack.  Replace with goog.string.quote
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/\%/g, '\\%')
                 .replace(/'/g, '\\\'');
  return '\'' + string + '\'';
};


/**
 * Generate code for all blocks in the workspace to the specified language.
 * @return {string} Generated code.
 */
Blockly.PythonOcto.workspaceToCode = function() {
  var code = [];
  this.init();
  var blocks = Blockly.mainWorkspace.getTopBlocks(true);
  for (var x = 0, block; block = blocks[x]; x++) {
    var line = this.blockToCode(block);
    if (Array.isArray(line) && line.length === 2 && typeof line[1] === "number") {
      // Value blocks return tuples of code and operator order.
      // Top-level blocks don't care about operator order.
      line = line[0];
    }
    if (line) {
      line =  Blockly.PythonOcto.makeSequence(line);
      if (block.outputConnection && this.scrubNakedValue) {
        // This block is a naked value.  Ask the language's code generator if
        // it wants to append a semicolon, or something.
        line = this.scrubNakedValue(line);
      }
      code.push(line);
    }
  }
  code = code.join('\n\n');  // Blank line between each section.
  code = this.finish(code);
  // Final scrubbing of whitespace.
  code = code.replace(/^\s+\n/, '');
  code = code.replace(/\n\s+$/, '\n');
  code = code.replace(/[ \t]+\n/g, '\n');
  return code;
};

Blockly.PythonOcto.makeSequence = function (code) {
  if (typeof code === "string") {
    return code;
  }
  if (code[code.length - 1] === "") {
    code.pop();
  }
  if (code.length > 1) {
    return "sequence(\n" + this.prefixLines(code.join(",\n"), this.INDENT) + "\n)";
  } else {
    return code[0];
  }
};

/**
 * Generate code for the specified block (and attached blocks).
 * @param {Blockly.Block} block The block to generate code for.
 * @return {string|!Array} For statement blocks, the generated code.
 *     For value blocks, an array containing the generated code and an
 *     operator order value.  Returns '' if block is null.
 */
Blockly.PythonOcto.blockToCode = function(block) {
  if (!block) {
    return '';
  }
  if (block.disabled) {
    // Skip past this block if it is disabled.
    return this.blockToCode(block.getNextBlock());
  }

  var func = this[block.type];
  if (!func) {
    throw 'Language "' + this.name_ + '" does not know how to generate code ' +
        'for block type "' + block.type + '".';
  }
  // First argument to func.call is the value of 'this' in the generator.
  // Prior to 24 September 2013 'this' was the only way to access the block.
  // The current prefered method of accessing the block is through the second
  // argument to func.call, which becomes the first parameter to the generator.
  var code = func.call(block, block);
  if (Array.isArray(code)) {
    // Value blocks return tuples of code and operator order.
    return [this.scrub_(block, code[0]), code[1]];
  } else if (typeof code === "string") {
    if (this.STATEMENT_PREFIX) {
      code = this.STATEMENT_PREFIX.replace(/%1/g, '\'' + block.id + '\'') +
          code;
    }
    return this.scrub_(block, code);
  } else if (code === null) {
    // Block has handled code generation itself.
    return '';
  } else {
    throw 'Invalid code generated: ' + code;
  }
};

/**
 * Generate code representing the specified value input.
 * @param {!Blockly.Block} block The block containing the input.
 * @param {string} name The name of the input.
 * @param {number} order The maximum binding strength (minimum order value)
 *     of any operators adjacent to "block".
 * @return {string} Generated code or '' if no blocks are connected or the
 *     specified input does not exist.
 */
Blockly.PythonOcto.valueToCode = function(block, name, order) {
  if (isNaN(order)) {
    throw 'Expecting valid order from block "' + block.type + '".';
  }
  var targetBlock = block.getInputTargetBlock(name);
  if (!targetBlock) {
    return '';
  }
  var tuple = this.blockToCode(targetBlock);
  if (tuple === '') {
    // Disabled block.
    return '';
  }
  if (!Array.isArray(tuple)) {
    // Value blocks must return code and order of operations info.
    // Statement blocks must only return code.
    throw 'Expecting tuple from value block "' + targetBlock.type + '".';
  }
  var code = tuple[0];
  var innerOrder = tuple[1];
  if (isNaN(innerOrder)) {
    throw 'Expecting valid order from value block "' + targetBlock.type + '".';
  }
  if (code && order <= innerOrder) {
    if (order == innerOrder || (order == 0 || order == 99)) {
      // 0 is the atomic order, 99 is the none order.  No parentheses needed.
      // In all known languages multiple such code blocks are not order
      // sensitive.  In fact in Python ('a' 'b') 'c' would fail.
    } else {
      // The operators outside this code are stonger than the operators
      // inside this code.  To prevent the code from being pulled apart,
      // wrap the code in parentheses.
      // Technically, this should be handled on a language-by-language basis.
      // However all known (sane) languages use parentheses for grouping.
      code = '(' + code + ')';
    }
  }
  return code;
};

/**
 * Generate code representing the statement.  Indent the code.
 * @param {!Blockly.Block} block The block containing the input.
 * @param {string} name The name of the input.
 * @return {string} Generated code or '' if no blocks are connected.
 */
Blockly.PythonOcto.statementToCode = function(block, name) {
  var targetBlock = block.getInputTargetBlock(name);
  var code = this.blockToCode(targetBlock);
  if (code === "") {
	return code;
  }
  if (!Array.isArray(code) || (code.length === 2 && typeof code[1] === "number")) {
    // Value blocks must return code and order of operations info.
    // Statement blocks must only return code.
    throw 'Expecting code from statement block "' + targetBlock.type + '".';
  }
  if (code) {
    code = Blockly.PythonOcto.makeSequence(code);
  }
  return code;
};

/**
 * Common tasks for generating Python from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The Python code created for this block.
 * @return {string} Python code with comments and subsequent blocks added.
 * @private
 */
Blockly.PythonOcto.scrub_ = function(block, code) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      commentCode += Blockly.PythonOcto.prefixLines(comment, '# ') + '\n';
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var x = 0; x < block.inputList.length; x++) {
      if (block.inputList[x].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[x].connection.targetBlock();
        if (childBlock) {
          var comment = Blockly.PythonOcto.allNestedComments(childBlock);
          if (comment) {
            commentCode += Blockly.PythonOcto.prefixLines(comment, '# ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = Blockly.PythonOcto.blockToCode(nextBlock);
  
  if (block.outputConnection) {
    // Is a value
    return commentCode + code + nextCode;
  } else {
    // Is a statement
    return [commentCode + code].concat(nextCode);
  }
};
