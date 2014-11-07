from twisted.internet import defer
from twisted.python import log

from octopus.sequence.util import Runnable, Pausable, Cancellable, BaseStep
from octopus.sequence.error import NotRunning, AlreadyRunning, NotPaused
from octopus.constants import State

from ..util import EventEmitter

defer.Deferred.debug = True

blocks = {}
def populate_blocks ():
	global blocks
	blocks = {}

	from .blocks import mathematics, text, logic, controls, variables

	for mod in (mathematics, text, logic, controls, variables):
		blocks.update(dict([(name, cls) for name, cls in mod.__dict__.items() if isinstance(cls, type)]))

	del blocks['Block']


class Workspace (Runnable, Pausable, Cancellable, EventEmitter):
	def __init__ (self):
		self.state = State.READY

		self.allBlocks = {}
		self.topBlocks = {}
		self.variables = {}

	def addBlock (self, id, args):
		try:
			blockType = args["type"]
			blockClass = blocks[blockType]
		except KeyError:
			raise Exception("Unknown Block: %s" %  blockType)

		block = blockClass(self, id)

		try:
			block.position = [args["x"], args["y"]]
		except KeyError:
			block.position = [0, 0]

		try:
			for field, value in args["fields"].iteritems():
				block.fields[field] = value
		except KeyError:
			pass

		block.created()

		self.allBlocks[block.id] = block
		self.topBlocks[block.id] = block

	def getBlock (self, id):
		try:
			return self.allBlocks[id]
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

	def connectBlock (self, id, args):
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

	def disconnectBlock (self, id, args):
		childBlock = self.getBlock(id)
		parentBlock = self.getBlock(args["parent"])

		# Cancel parent block if waiting for data
		try:
			if childBlock._complete.called is False:
				childBlock._complete.errback(Disconnected())
				childBlock._complete = None
		except AttributeError:
			pass

		connection = args["connection"]

		self.topBlocks[id] = childBlock

		if connection == "input-value":
			parentBlock.disconnectInput(args["input"], "value")
		elif connection == "input-statement":
			parentBlock.disconnectInput(args["input"], "statement")
		elif connection == "previous":
			parentBlock.disconnectNextBlock(childBlock)

	def changeBlock (self, id, change, args):
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

	#
	# Controls
	#

	def _run (self):
		self._complete = defer.Deferred()

		results = []
		for block in self.topBlocks.itervalues():
			results.append(block.run())

		def _error (failure):
			try:
				self._cancel(abort = True).addErrback(log.err)
			except NotRunning:
				pass

			# Return the actual error
			return failure.value.subFailure

		# If any one step fails, cancel the rest.
		defer.gatherResults(results, consumeErrors = True).addCallbacks(
			self._complete.callback,
			_error
		).addErrback(self._complete.errback)

		return self._complete

	def _reset (self):
		results = []
		for block in self.topBlocks.itervalues():
			try:
				results.append(block.reset())
			except AlreadyRunning:
				pass

		return defer.DeferredList(results)

	def _pause (self):
		results = []
		for block in self.topBlocks.itervalues():
			try:
				results.append(block.pause())
			except NotRunning:
				pass

		return defer.DeferredList(results)

	def _resume (self):
		results = []
		for block in self.topBlocks.itervalues():
			try:
				block.resume()
			except NotPaused:
				pass

		return defer.DeferredList(results)

	def _cancel (self, abort = False):
		results = []
		for block in self.topBlocks.itervalues():
			try:
				block.cancel(abort)
			except NotRunning:
				pass

		return defer.DeferredList(results)

	#
	# Serialisation
	#

	def toEvents (self):
		events = []
		for block in self.topBlocks.itervalues():
			events.extend(block.toEvents())

		return events

	def fromEvents (self, events):
		for event in events:
			data = event['data']
			if event['type'] == "AddBlock":
				self.addBlock(data['block'], data)
			elif event['type'] == "ChangeBlock":
				self.changeBlock(data['block'], data['change'], data)
			elif event['type'] == "ConnectBlock":
				self.connectBlock(data['block'], data)


def anyOfStackIs (block, states):
	while block:
		if block.state in states:
			return True

		block = block.nextBlock


class Block (BaseStep, EventEmitter):

	@property
	def state (self):
		return self._state

	@state.setter
	def state (self, value):
		self._state = value
		self.workspace.emit("block-state", block = self.id, state = value.name)

	def __init__ (self, workspace, id):
		self.workspace = workspace
		self.id = id
		self.type = self.__class__.__name__
		self.state = State.READY
		self.nextBlock = None
		self.prevBlock = None
		self.outputBlock = None
		self.parentInput = None
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
		childBlock.parentInput = None

		@childBlock.on('connectivity-changed')
		def onConnChange (data):
			self.emit('connectivity-changed')

		@childBlock.on('value-changed')
		def onValueChange (data):
			self.emit('value-changed')

		@self.on('disconnected')
		def onDisconnect (data):
			if "next" in data and data['next'] is True:
				childBlock.off('connectivity-changed', onConnChange)
				childBlock.off('value-changed', onValueChange)
				self.off('disconnected', onDisconnect)

	def disconnectNextBlock (self, childBlock):
		if self.nextBlock != childBlock:
			raise Exception("Block.disconnectNextBlock: must pass the correct child block")

		self.nextBlock = None
		childBlock.prevBlock = None
		childBlock.parentInput = None

		self.emit('disconnected', next = True)
		self.emit('connectivity-changed')

	def getSurroundParent (self):
		block = self

		while block is not None:
			if block.outputBlock is not None:
				block = block.outputBlock
				continue

			prev = block.prevBlock

			if prev.nextBlock is block:
				block = prev
			else:
				return prev

		return None

	def getChildren (self):
		children = []

		for block in self.inputs.itervalues():
			if block is not None:
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
		childBlock.parentInput = inputName

		@childBlock.on('connectivity-changed')
		def onConnChange (data):
			self.emit('connectivity-changed')

		@childBlock.on('value-changed')
		def onValueChange (data):
			self.emit('value-changed')

		@self.on('disconnected')
		def onDisconnect (data):
			if "input" in data and data['input'] == inputName:
				childBlock.off('connectivity-changed', onConnChange)
				childBlock.off('value-changed', onValueChange)
				self.off('disconnected', onDisconnect)

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
		childBlock.parentInput = None

		self.emit('disconnected', input = inputName)
		self.emit('connectivity-changed')

	def removeInput (self, inputName):
		if self.inputs[inputName] is not None:
			self.disconnectInput(inputName)

		del self.inputs[inputName]

	def getVariables (self):
		variables = []

		for block in self.getChildren():
			variables.extend(block.getVariables())

		return variables

	def _runNext (self, complete):
		""" Run the next block, chaining the callbacks """

		if self.state not in (State.CANCELLED, State.ERROR):
			self.state = State.COMPLETE

		if self.nextBlock is not None:
			return self.nextBlock.run().addCallbacks(
				complete.callback, 
				complete.errback
			)
		else:
			return complete.callback(None)

	#
	# Control
	#

	def run (self, parent = None):
		# If this is ready, then the entire stack must be ready.
		if self.state is not State.READY:
			raise AlreadyRunning

		self.state = State.RUNNING
		self.parent = parent
		return defer.maybeDeferred(self._run)

	def eval (self):
		return defer.succeed(None)

	def pause (self):
		if self.state is State.RUNNING:
			self.state = State.PAUSED

			results = [defer.maybeDeferred(self._pause)]
			for block in self.getChildren():
				try:
					results.append(block.pause())
				except NotRunning:
					pass

			return defer.DeferredList(results)

		# Pass on pause call to next block.
		elif self.nextBlock is not None:
			return self.nextBlock.pause()

		# Bottom of stack, nothing was running
		else:
			raise NotRunning

	def resume (self):
		if self.state is State.PAUSED:
			self.state = State.RUNNING

			results = [defer.maybeDeferred(self._resume)]

			# Blocks can set a function to call when they are resumed
			try:
				onResume, self._onResume = self._onResume, None
				onResume()
			except (AttributeError, TypeError):
				pass

			# Resume all children
			for block in self.getChildren():
				try:
					block.resume()
				except NotPaused:
					pass

			return defer.DeferredList(results)

		# Pass on resume call
		elif self.nextBlock is not None:
			return self.nextBlock.resume()

		# Bottom of stack, nothing needed resuming
		else:
			raise NotPaused

	def cancel (self, abort = False):
		if self.state in (State.RUNNING, State.PAUSED):
			self.state = State.CANCELLED

			self._onResume = None

			results = [defer.maybeDeferred(self._cancel, abort)]
			for block in self.getChildren():
				# Cancel all children
				try:
					results.append(block.cancel(abort))
				except NotRunning:
					pass

			# Send cancelled message to any parent block.
			try:
				if self._complete.called is False:
					self._complete.errback(Cancelled())
					self._complete = None
			except AttributeError:
				pass

			return defer.DeferredList(results)

		# Pass on cancel call to next block.
		elif self.nextBlock is not None:
			return self.nextBlock.cancel(abort)

		# Bottom of stack, nothing was running
		else:
			raise NotRunning

	def reset (self):
		# Entire stack must not be RUNNING or PAUSED
		if anyOfStackIs(self, (State.RUNNING, State.PAUSED)):
			raise AlreadyRunning

		if self.state is not State.READY:
			self.state = State.READY
			self._onResume = None

			results = [defer.maybeDeferred(self._reset)]
			for block in self.getChildren():
				try:
					results.append(block.reset())
				except AlreadyRunning:
					# Something has gone wrong as the this block's state should
					# reflect those of its (input) children.
					# Try to cancel the child.
					results.append(block.cancel().addCallback(block.reset))

			return defer.DeferredList(results)

		elif self.nextBlock is not None:
			return self.nextBlock.reset()

		# Bottom of stack, nothing needed to be reset.
		else:
			return defer.succeed(None)

	#
	# Serialise
	#

	def toEvents (self):
		events = []
		events.append({ "type": "AddBlock", "data": { "block": self.id, "type": self.type, "fields": self.fields, "x": self.position[0], "y": self.position[1] }})

		if self.disabled:
			events.append({ "type": "ChangeBlock", "data": { "block": self.id, "change": "disabled", "value": True }})		

		if self.inputsInline:
			events.append({ "type": "ChangeBlock", "data": { "block": self.id, "change": "inputs-inline", "value": True }})		

		if self.outputBlock is not None:
			events.append({ "type": "ConnectBlock", "data": { "block": self.id, "connection": "input-value", "parent": self.outputBlock.id, "input": self.parentInput }})
			
		elif self.prevBlock is not None:
			if self.parentInput is not None:
				events.append({ "type": "ConnectBlock", "data": { "block": self.id, "connection": "previous", "parent": self.prevBlock.id, "input": self.parentInput }})
			else:
				events.append({ "type": "ConnectBlock", "data": { "block": self.id, "connection": "previous", "parent": self.prevBlock.id }})

		for child in self.getChildren():
			events.extend(child.toEvents())

		return events

class Disconnected (Exception):
	pass

class Cancelled (Exception):
	pass

class Aborted (Cancelled):
	pass

populate_blocks()
