from util import EventEmitter

class Workspace (object):
	def __init__ (self):
		self.allBlocks = {}
		self.topBlocks = {}
		self.variables = {}

	def addBlock (self, id, **args):
		block = Block(self, id, args["type"])
		block.position = [args["x"], args["y"]]

		for field, value in args["fields"].itervalues():
			block.fields[field] = value

		block.created()

		self.allBlocks[block.id] = block
		self.topBlocks[block.id] = block

	def getBlock (self, id):
		try:
			block = self.allBlocks[id]
		except KeyError:
			print "Attempted to access unconnected block %s" % id
			raise

	def removeBlock (self, id):
		block = self.getBlock(id)

		# Cancel parent block if waiting for data
		try:
			if block._complete.called is False:
				block._complete.errback(Disconnected())
				block._complete = None
		except AttributeError:
			pass

		# Disconnect prevBlock connection
		prev = block.prevBlock
		if prev is not None:
			if prev.nextBlock == block:
				prev.nextBlock = None
			else:
				prevInputs = prev.inputs
				for input in prevInputs.iterkeys():
					if prevInputs[input] is block:
						prevInputs[input] = None

		# Disconnect nextBlock connection
		next = block.nextBlock
		if next is not None:
			if next.prevBlock == block:
				next.prevBlock = None

		# Disconnect output connection
		output = block.outputBlock
		if output is not None:
			outputInputs = output.inputs
			for input in outputInputs.iterkeys():
				if outputInputs[input] is block:
					outputInputs[input] = None

		try:
			del self.topBlocks[block.id]
		except KeyError:
			pass

		try:
			del self.allBlocks[block.id]
		except KeyError:
			pass

		block.disposed()

	def connectBlock (self, id, **args):
		childBlock = self.getBlock(id)
		parentBlock = self.getBlock(args["parent"])

		connection = args["connection"]

		if id in self.topBlocks:
			del self.topBlocks[id]

		if connection == "input-value":
			parentBlock.connectInput(args["input"], childBlock, "value")
		elif connection == "input-statement":
			parentBlock.connectInput(args["input"], childBlock, "statement")
		elif connection == "previous":
			parentBlock.connectNextBlock(childBlock)

	def disconnectBlock (self, id, **args):
		childBlock = self.getBlock(id)
		parentBlock = self.getBlock(args["parent"])

		# Cancel parent block if waiting for data
		try:
			if block._complete.called is False:
				block._complete.errback(Disconnected())
				block._complete = None
		except AttributeError:
			pass

		connection = args["connection"]

		self.topBlocks[id] = block

		if connection == "input-value":
			parentBlock.disconnectInput(args["input"], childBlock, "value")
		elif connection == "input-statement":
			parentBlock.disconnectInput(args["input"], childBlock, "statement")
		elif connection == "previous":
			parentBlock.disconnectNextBlock(childBlock)

	def changeBlock (self, id, change, **args):
		block = self.getBlock(id)

		if change == "position":
			block.position = [args["x"], args["y"]]
		elif change == "field-value":
			fieldName = args["field"]
			block.setFieldValue(fieldName, args["value"])
		elif change == "disabled":
			block.disabled = args["value"]
		elif change == "inputs-inline":
			block.inputsInline = args["value"]
		elif change == "remove-input":
			block.removeInput(args["name"])


class Block (EventEmitter):
	def __init__ (self, workspace, id, type):
		self.workspace = workspace
		self.id = id
		self.type = type
		self.nextBlock = None
		self.prevBlock = None
		self.outputBlock = None
		self._complete = None
		self.fields = {}
		self.inputs = {}
		self.disabled = False
		self.position = [0, 0]
		self.inputsInline = False

	def created (self):
		pass

	def disposed (self):
		pass

	def connectNextBlock (self, childBlock):
		if self.nextBlock is not None:
			raise Exception("Block.connectNextBlock: parent already has a next Block")
		if childBlock.prevBlock is not None:
			raise Exception("Block.connectNextBlock: child already has a previous Block")

		self.nextBlock = childBlock
		childBlock.prevBlock = self

		@childBlock.on('connectivity-changed')
		def onConnChange (data):
			self.emit('connectivity-changed')

		@childBlock.on('value-changed')
		def onValueChange (data):
			self.emit('value-changed')

		@self.on('disconnected'):
		def onDisconnect (data):
			if "next" in data and data.next == True:
				childBlock.off('connectivity-changed', onConnChange)
				childBlock.off('value-changed', onValueChange)
				self.off(onDisconnect)

	def disconnectNextBlock (self, childBlock):
		if self.nextBlock != childBlock:
			raise Exception("Block.disconnectNextBlock: must pass the correct child block")

		self.nextBlock = None
		childBlock.prevBlock = None

		self.emit('disconnected', next = True)
		self.emit('connectivity-changed')

	def getSurroundParent (self):
		block = self

		while block is not None:
			if block.outputBlock is not None:
				block = block.outputBlock
				continue

			prev = block.prevBlock:

			if prev.nextBlock is block:
				block = prev
			else:
				return prev

		return None

	def getChildren (self):
		children = []

		for block in self.inputs.itervalues():
			children.append(block)

		if self.nextBlock is not None:
			children.append(self.nextBlock)

		return children

	def setFieldValue (self, fieldName, value):
		self.fields[fieldName] = value
		self.emit('value-changed')

	def getFieldValue (self, fieldName):
		return self.fields[fieldName]

	def getInput (self, inputName):
		return self.inputs[inputName]

	def getInputValue (self, inputName):
		input = self.inputs[inputName]

		def error (failure):
			failure.trap(Disconnected)
			return False

		return input.eval().addErrback(error)

	def connectInput (self, inputName, childBlock, type):
		if type == "value":
			childBlock.outputBlock = self
		elif type == "statement":
			childBlock.prevBlock = self
		else:
			raise Exception("Block.connectInput: invalid type %s" % type)

		self.inputs[inputName] = childBlock

		@childBlock.on('connectivity-changed')
		def onConnChange (data):
			self.emit('connectivity-changed')

		@childBlock.on('value-changed')
		def onValueChange (data):
			self.emit('value-changed')

		@self.on('disconnected'):
		def onDisconnect (data):
			if "input" in data and data.input == inputName:
				childBlock.off('connectivity-changed', onConnChange)
				childBlock.off('value-changed', onValueChange)
				self.off(onDisconnect)

	def disconnectInput (self, inputName, type):
		try:
			childBlock = self.inputs[inputName]
		except KeyError:
			return

		if type == "value":
			childBlock.outputBlock = None
		elif type == "statement":
			childBlock.prevBlock = None
		else:
			raise Exception("Block.disconnectInput: invalid type %s" % type)

		self.inputs[inputName] = None

		self.emit('disconnected', input = inputName)
		self.emit('connectivity-changed')

	def removeInput (self, inputName):
		if self.inputs[inputName] is not None:
			self.disconnectInput(inputName):

		del self.inputs[inputName]

	def getVariables (self):
		variables = []

		for block in self.getChildren():
			variables.extend(block.getVariables())

		return variables

	def _runNext (self, complete):
		""" Run the next block, chaining the callbacks """
		self.emit('completed')

		if self.nextBlock is not None:
			return self.nextBlock.run().addCallbacks(complete.callback, complete.errback)
		else:
			return complete.callback(None)

	def run (self):
		return defer.succeed(None)

	def eval (self):
		return defer.succeed(None)

	def pause (self):
		self.emit("paused")
		for block in self.getChildren():
			block.pause()

	def resume (self):
		self.emit("resumed")
		for block in self.getChildren():
			block.resume()

	def cancel (self):
		self.emit("cancelled")
		for block in self.getChildren():
			block.cancel()

	def abort (self):
		self.emit("aborted")
		for block in self.getChildren():
			block.abort()

	def reset (self):
		self.emit("reset")
		for block in self.getChildren():
			block.reset()


class Disconnected (Exception):
	pass
