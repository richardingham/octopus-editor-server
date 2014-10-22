
class Workspace (object):
	def __init__ (self):
		self.allBlocks = {}
		self.topBlocks = {}

	def addBlock (self, id, **args):
		block = Block(id, args["type"])
		block.position = [args["x"], args["y"]]

		for field, value in args["fields"].itervalues():
			block.fields[field] = value

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
			block.fields[fieldName] = args["value"]
		elif change == "disabled":
			block.disabled = args["value"]
		elif change == "inputs-inline":
			block.inputsInline = args["value"]
		elif change == "remove-input":
			del block.inputs[args["name"]]


class Block (object):
	def __init__ (self, id, type):
		self.id = id
		self.type = type
		self.nextBlock = None
		self.prevBlock = None
		self.outputBlock = None
		self.fields = {}
		self.inputs = {}
		self.disabled = False
		self.position = [0, 0]
		self.inputsInline = False

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

		for block in this.inputs.itervalues():
			children.append(block)

		return children

