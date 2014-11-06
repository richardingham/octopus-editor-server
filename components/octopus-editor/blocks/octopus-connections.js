Blockly.Blocks['connection_tcp'] = {
  init: function() {
    //this.setHelpUrl('http://www.example.com/');
    this.setColour(60);
    this.appendDummyInput()
        .appendField("TCP - ip")
        .appendField(new Blockly.FieldTextInput("192.168.15.100"), "HOST")
        .appendField("port")
        .appendField(new Blockly.FieldTextInput("9000"), "PORT");
    this.setOutput(true, "machine-connection");
    this.setTooltip('Represents a TCP/IP (Ethernet) connection to a machine. Fill in the IP and Port fields.');
  }
};

Blockly.Blocks['connection_serial'] = {
  init: function() {
    //this.setHelpUrl('http://www.example.com/');
    this.setColour(60);
    this.appendDummyInput()
        .appendField("Serial - port")
        .appendField(new Blockly.FieldTextInput("/dev/ttyS0"), "PORT")
        .appendField("baudrate")
        .appendField(new Blockly.FieldTextInput("19200"), "BAUD");
    this.setOutput(true, "machine-connection");
    this.setTooltip('Represents a Direct serial (RS-232) connection to a machine. Fill in the Port and Baudrate fields.');
  }
};
