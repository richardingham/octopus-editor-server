
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
			input = args["input"]
			parentBlock.inputs[input] = childBlock
			childBlock.outputBlock = parentBlock
		elif connection == "input-statement":
			input = args["input"]
			parentBlock.inputs[input] = childBlock
			childBlock.prevBlock = parentBlock
		elif connection == "previous":
			parentBlock.nextBlock = childBlock
			childBlock.prevBlock = parentBlock

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
			input = args["input"]
			parentBlock.inputs[input] = None
			childBlock.outputBlock = None
		elif connection == "input-statement":
			input = args["input"]
			parentBlock.inputs[input] = None
			childBlock.prevBlock = None
		elif connection == "previous":
			parentBlock.nextBlock = None
			childBlock.prevBlock = None

	def changeBlock (self, id, change, **args):
		block = self.getBlock(id)

		if change == "position":
			block.position = [args["x"], args["y"]]
		elif change == "field-value":
			fieldName = args["field"]
			block.setField(fieldName, args["value"])
		elif change == "disabled":
			block.disabled = args["value"]
		elif change == "inputs-inline":
			block.inputsInline = args["value"]
		elif change == "remove-input":
			del block.inputs[args["name"]]


class Block (object):
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

	def setField (self, fieldName, value):
		self.fields[fieldName] = value

	def getFieldValue (self, fieldName):
		return self.fields[fieldName]

	def getInput (self, fieldName):
		return self.inputs[fieldName]

	def getInputValue (self, fieldName):
		input = self.inputs[fieldName]

		def error (failure):
			failure.trap(Disconnected)
			return False

		return input.eval().addErrback(error)

	def getVariables (self):
		variables = []

		for block in self.getChildren():
			variables.extend(block.getVariables())

		return variables

	def _runNext (self, complete):
		""" Run the next block, chaining the callbacks """
		if self.nextBlock is not None:
			return self.nextBlock.run().addCallbacks(complete.callback, complete.errback)
		else:
			return complete.callback(None)

	def run (self):
		return defer.succeed(None)

	def eval (self):
		return defer.succeed(None)

	def pause (self):
		for block in self.getChildren():
			block.pause()

	def resume (self):
		for block in self.getChildren():
			block.resume()

	def cancel (self):
		for block in self.getChildren():
			block.cancel()

	def abort (self):
		for block in self.getChildren():
			block.abort()

	def reset (self):
		for block in self.getChildren():
			block.reset()


class Disconnected (Exception):
	pass
