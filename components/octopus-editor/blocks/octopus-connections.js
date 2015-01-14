Blockly.Blocks['connection_tcp'] = {
  init: function() {
    //this.setHelpUrl('http://www.example.com/');
    this.setColour(Blockly.CONNECTIONS_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField("TCP - ip")
        .appendField(new Blockly.FieldTextInput("192.168.15.100"), "HOST")
        .appendField("port")
        .appendField(new Blockly.FieldTextInput("9000"), "PORT");
    this.setOutput(true, "MachineConnection");
    this.setTooltip('Represents a TCP/IP (Ethernet) connection to a machine. Fill in the IP and Port fields.');
  }
};

Blockly.Blocks['connection_serial'] = {
  init: function() {
    //this.setHelpUrl('http://www.example.com/');
    this.setColour(Blockly.CONNECTIONS_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField("Serial - port")
        .appendField(new Blockly.FieldTextInput("/dev/ttyS0"), "PORT")
        .appendField("baudrate")
        .appendField(new Blockly.FieldTextInput("19200"), "BAUD");
    this.setOutput(true, "MachineConnection");
    this.setTooltip('Represents a Direct serial (RS-232) connection to a machine. Fill in the Port and Baudrate fields.');
  }
};

Blockly.Blocks['connection_phidget'] = {
  init: function() {
    //this.setHelpUrl('http://www.example.com/');
    this.setColour(Blockly.CONNECTIONS_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField("Phidget ID")
        .appendField(new Blockly.FieldTextInput("0"), "ID");
    this.setOutput(true, "PhidgetConnection");
    this.setTooltip('Represents a Phidget device. Specify the serial ID of the phidget board.');
  }
};

Blockly.Blocks['connection_cvcamera'] = {
  init: function() {
    //this.setHelpUrl('http://www.example.com/');
    this.setColour(Blockly.CONNECTIONS_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField("Camera - no. ")
        .appendField(new Blockly.FieldTextInput("0"), "ID");
    this.setOutput(true, "CameraConnection");
    this.setTooltip('Represents a USB webcamera. The first camera has id 0, the second 1, and so on.');
  }
};
