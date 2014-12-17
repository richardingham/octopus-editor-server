# Twisted Imports
from twisted.internet import reactor, defer, task
from twisted.python import log

# Octopus Imports
from octopus.sequence.util import Runnable, Pausable, Cancellable, BaseStep
from octopus.sequence.error import NotRunning, AlreadyRunning, NotPaused
from octopus.constants import State
from octopus.data.data import BaseVariable
from octopus.machine import Component

# Package Imports
from ..util import EventEmitter

# Debugging
defer.Deferred.debug = True


def populate_blocks ():
	def subclasses (cls):
		return cls.__subclasses__() + [
			g for s in cls.__subclasses__()
            for g in subclasses(s)
		]

	from .blocks import mathematics, text, logic, controls, variables, machines, dependents, images

	Workspace.blocks = { c.__name__: c for c in subclasses(Block) }


class Workspace (Runnable, Pausable, Cancellable, EventEmitter):
	blocks = {}

	def __init__ (self):
		self.state = State.READY

		self.allBlocks = {}
		self.topBlocks = {}
		self.variables = Variables()

	def addBlock (self, id, type, fields = None, x = 0, y = 0):
		try:
			blockType = type
			blockClass = self.blocks[blockType]
		except KeyError:
			raise Exception("Unknown Block: %s" %  blockType)

		block = blockClass(self, id)
		block.position = [x, y]

		try:
			for field, value in fields.iteritems():
				block.fields[field] = value
		except AttributeError:
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

	def connectBlock (self, id, parent, connection, input = None):
		childBlock = self.getBlock(id)
		parentBlock = self.getBlock(parent)

		if id in self.topBlocks:
			del self.topBlocks[id]

		if connection == "input-value":
			parentBlock.connectInput(input, childBlock, "value")
		elif connection == "input-statement":
			parentBlock.connectInput(input, childBlock, "statement")
		elif connection == "previous":
			parentBlock.connectNextBlock(childBlock)

	def disconnectBlock (self, id, parent, connection, input = None):
		childBlock = self.getBlock(id)
		parentBlock = self.getBlock(parent)

		# Cancel parent block if waiting for data
		try:
			if childBlock._complete.called is False:
				childBlock._complete.errback(Disconnected())
				childBlock._complete = defer.Deferred()
		except AttributeError:
			pass

		self.topBlocks[id] = childBlock

		if connection == "input-value":
			parentBlock.disconnectInput(input, "value")
		elif connection == "input-statement":
			parentBlock.disconnectInput(input, "statement")
		elif connection == "previous":
			parentBlock.disconnectNextBlock(childBlock)

	#
	# Controls
	#

	def _run (self):
		self._complete = defer.Deferred()
		dependencyGraph = []
		runningBlocks = set()
		externalStopBlocks = set()
		resumeBlocks = []
		self.emit("workspace-started")

		def _runBlock (block):
			if self.state is State.PAUSED:
				self._onResume = _onResume
				resumeBlocks.add(block)
				return

			if block.externalStop:
				externalStopBlocks.add(block)
			else:
				runningBlocks.add(block)

			# Run in the next tick so that dependency graph
			# and runningBlocks are all updated before blocks
			# are run (and potentially finish)
			d = task.deferLater(reactor, 0, block.run)
			d.addCallbacks(
				callback = _blockComplete,
				callbackArgs = [block],
				errback = _blockError, 
				errbackArgs = [block]
			)
			d.addErrback(log.err)

		def _onResume ():
			for block in resumeBlocks:
				_runBlock(block)

			resumeBlocks = []

		def _blockComplete (result, block):
			if block.externalStop:
				return

			runningBlocks.discard(block)
			decls = block.getDeclarationNames()

			print "Satisfied dependencies: " + str(decls)

			# Check if any other blocks can be run
			toRun = []
			for item in dependencyGraph:
				for decl in decls:
					item["deps"].discard(decl)

				if len(item["deps"]) is 0:
					toRun.append(item)

			# _runBlock needs to be called in the next tick (done in _runBlock)
			# so that the dependency graph is updated before any new blocks run. 
			for item in toRun:
				dependencyGraph.remove(item)
				_runBlock(item["block"])

			log.msg("Block %s completed, now running %s" % (block.id, [i["block"].id for i in toRun]))

			# Check if the experiment can be finished
			reactor.callLater(0, _checkFinished)

		def _blockError (failure, block):
			if failure.type is Disconnected:
				return _blockComplete(block)

			# If any one step fails, cancel the rest.
			if not _blockError.called:
				log.msg("Received error %s from block %s. Aborting." % (failure, block.id))

				def _errback (error):
					# Pass the error if this is called as errback, or else
					# the original failure if abort() had no errors.
					# Call later to try to allow any other block-state events
					# to propagate before the listeners are cancelled.
					if not self._complete.called:
						_externalStop()
						self.state = State.ERROR
						reactor.callLater(0, self._complete.errback, error or failure)

					self.emit("workspace-stopped")
					_blockError.called = True

				try:
					self.abort().addBoth(_errback)
				except NotRunning:
					pass

		# Allow access to called within scope of _blockError
		_blockError.called = False

		def _updateDependencyGraph (data = None):
			for item in dependencyGraph:
				item['deps'] = set(item['block'].getVariableNames())

		@self.on('top-block-added')
		def onTopBlockAdded (data):
			block = data['block']
			print "Block #%s added to top blocks (%s)" % (block.id, block._complete)

			if block._complete is not None and block._complete.called is False:	
				if block.externalStop:
					externalStopBlocks.add(block)
				else:
					runningBlocks.add(block)

				block._complete.addCallbacks(
					callback = _blockComplete,
					callbackArgs = [block],
					errback = _blockError, 
					errbackArgs = [block]
				).addErrback(log.err)

			_updateDependencyGraph()

		self.on('top-block-removed', _updateDependencyGraph)

		def _checkFinished (error = None):
			log.msg("Finished?: Waiting for %s blocks" % len(runningBlocks))

			if len(runningBlocks) > 0:
				return

			log.msg("Skipped blocks:" + str(dependencyGraph))

			if not (_blockError.called or self._complete.called):
				_externalStop()
				self.state = State.COMPLETE
				self._complete.callback(None)
				self.emit("workspace-stopped")
				self.off('top-block-added', onTopBlockAdded)
				self.off('top-block-removed', _updateDependencyGraph)

		def _externalStop ():
			for block in externalStopBlocks:
				try:
					block.cancel(propagate = True).addErrback(log.err)
				except NotRunning:
					pass

		# Get all blocks ordered by x then y.
		blocks = sorted(self.topBlocks.itervalues(), key = lambda b: b.position)

		# Run each block based on the dependency graph
		for block in blocks:
			deps = block.getVariableNames()
			decls = block.getDeclarationNames()

			if len(deps) is 0:
				log.msg("Block %s has no deps, running now" % block.id)
				_runBlock(block)
			else:
				log.msg("Block %s waiting for %s" % (block.id, deps))
				dependencyGraph.append({
					"block": block,
					"deps": set(deps)
				})

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

		self.emit("workspace-paused")
		return defer.DeferredList(results)

	def _resume (self):
		results = []
		for block in self.topBlocks.itervalues():
			try:
				block.resume()
			except NotPaused:
				pass

		self.emit("workspace-resumed")
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
		for e in events:
			if "block" in e['data']:
				e['data']['id'] = e['data']['block']
			event = Event.fromPayload(e['type'], e['data'])
			event.apply(self)


class Variables (EventEmitter):
	def __init__ (self):
		self._variables = {}
		self._handlers = {}

	def add (self, name, variable):
		if name in self._variables:
			if self._variables[name] is variable:
				return

			self.remove(name)

		self._variables[name] = variable

		def _makeHandler (name):
			def onChange (data):
				self.emit('variable-changed', name = name, **data)

			return onChange

		if isinstance(variable, BaseVariable):
			onChange = _makeHandler(name)
			variable.on('change', onChange)
			self._handlers[name] = onChange

		elif isinstance(variable, Component):
			handlers = {}
			for attrname, attr in variable.variables.iteritems():
				onChange = _makeHandler(attrname)
				attr.on('change', onChange)
				handlers[attrname] = onChange

			self._handlers[name] = handlers

		else:
			self._handlers[name] = None

	def remove (self, name):
		try:
			variable = self._variables[name]
		except KeyError:
			return

		if isinstance(variable, BaseVariable):
			variable.off(
				'change', 
				self._handlers[name]
			)

		elif isinstance(variable, Component):
			for attrname, attr in variable.variables.iteritems():
				attr.off(
					'change',
					self._handlers[name][attrname]
				)

		del self._variables[name]
		del self._handlers[name]

	def rename (self, oldName, newName):
		if oldName == newName:
			return

		if oldName in self._variables:
			self._variables[newName] = self._variables[oldName]
			del self._variables[oldName]

			self._handlers[newName] = self._handlers[oldName]
			del self._handlers[oldName]

	def get (self, name):
		try:
			return self._variables[name]
		except KeyError:
			return None

	__getitem__ = get
	__setitem__ = add
	__delitem__ = remove

	def iteritems (self):
		return self._variables.iteritems()

	def itervalues (self):
		return self._variables.itervalues()


def anyOfStackIs (block, states):
	while block:
		if block.state in states:
			return True

		block = block.nextBlock


class Block (BaseStep, EventEmitter):

	# If this block needs to be stopped by the workspace
	# (e.g. long-running disconnected controls)
	externalStop = False

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
		self.mutation = ""
		self.comment = ""
		#self._addedInputs = []
		self.collapsed = False
		self.disabled = False
		self.position = [0, 0]
		self.inputsInline = None

	def created (self):
		pass

	def disposed (self):
		pass

	def connectNextBlock (self, childBlock):
		if self.nextBlock is not None:
			raise Exception("Block.connectNextBlock (#%s): parent #%s already has a next Block" % (childBlock.id, self.id))
		if childBlock.prevBlock is not None:
			raise Exception("Block.connectNextBlock (#%s): child #%s already has a previous Block" % (self.id, childBlock.id))

		self.nextBlock = childBlock
		childBlock.prevBlock = self
		childBlock.parentInput = None

		if self.state in (State.READY, State.RUNNING, State.PAUSED):
			try:
				childBlock.reset()
			except AlreadyRunning:
				pass

		@childBlock.on('connectivity-changed')
		def onConnChange (data):
			self.emit('connectivity-changed', **data)

		@childBlock.on('value-changed')
		def onValueChange (data):
			self.emit('value-changed', **data)

		@self.on('disconnected')
		def onDisconnect (data):
			if "next" in data and data['next'] is True:
				childBlock.off('connectivity-changed', onConnChange)
				childBlock.off('value-changed', onValueChange)
				self.off('disconnected', onDisconnect)

		self.emit('connectivity-changed')
		self.workspace.emit('top-block-removed', block = childBlock)

	def disconnectNextBlock (self, childBlock):
		if self.nextBlock != childBlock:
			raise Exception("Block.disconnectNextBlock: must pass the correct child block")

		self.nextBlock = None
		childBlock.prevBlock = None
		childBlock.parentInput = None

		self.emit('disconnected', next = True)
		self.emit('connectivity-changed')
		self.workspace.emit('top-block-added', block = childBlock)

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
		oldValue = self.fields[fieldName]
		self.fields[fieldName] = value
		self.emit('value-changed', 
			block = self,
			field = fieldName,
			oldValue = oldValue,
			newValue = value
		)

	def getFieldValue (self, fieldName):
		return self.fields[fieldName]

	def getInput (self, inputName):
		return self.inputs[inputName]

	def getInputValue (self, inputName, default = False):
		try:
			input = self.inputs[inputName]
		except KeyError:
			input = None

		if input is None:
			return defer.succeed(default)

		def error (failure):
			failure.trap(Cancelled, Disconnected)
			return default

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
			self.emit('connectivity-changed', **data)

		@childBlock.on('value-changed')
		def onValueChange (data):
			self.emit('value-changed', **data)

		@self.on('disconnected')
		def onDisconnect (data):
			if "input" in data and data['input'] == inputName:
				childBlock.off('connectivity-changed', onConnChange)
				childBlock.off('value-changed', onValueChange)
				self.off('disconnected', onDisconnect)

		self.emit('connectivity-changed')
		self.workspace.emit('top-block-removed', block = childBlock)

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
		self.workspace.emit('top-block-added', block = childBlock)

	def getVariables (self):
		variables = []

		for block in self.getChildren():
			variables.extend(block.getVariables())

		return variables

	def getVariableNames (self):
		variables = []

		for block in self.getChildren():
			variables.extend(block.getVariableNames())

		return variables

	def getDeclarationNames (self):
		variables = []

		for block in self.getChildren():
			variables.extend(block.getDeclarationNames())

		return variables

	#
	# Control
	#

	def run (self, parent = None):
		# This block has been disabled or cancelled - skip it.
		if self.disabled is True or self.state is State.CANCELLED:
			if self.nextBlock is not None:
				return self.nextBlock.run(parent)
			else:
				return defer.succeed(None)

		# If this block is ready, then the entire stack must be ready.
		if self.state is not State.READY:
			raise AlreadyRunning

		self.state = State.RUNNING
		self.parent = parent

		self._complete = defer.Deferred()

		def _done (result = None):
			""" Run the next block, chaining the callbacks """

			if self.state is State.PAUSED:
				self._onResume = _done
				return

			if self.state not in (State.CANCELLED, State.ERROR):
				self.state = State.COMPLETE

			if self.state is State.ERROR or self._complete is None:
				# Don't continue execution if there has been an error
				# (i.e. abort has been called)
				pass
			elif self.nextBlock is not None:
				def _disconnected (failure):
					f = failure.trap(Cancelled, Disconnected)

					if f is Aborted:
						raise f

				self.nextBlock.run().addErrback(
					_disconnected
				).addCallbacks(
					lambda result: self._complete.callback(result),
					lambda failure: self._complete.errback(failure)
				)
			else:
				self._complete.callback(None)

		def _error (failure):
			log.err("Block %s #%s Error: %s" % (self.type, self.id, failure))
			self.state = State.ERROR

			if self._complete is not None:
				self._complete.errback(failure)

		d = defer.maybeDeferred(self._run)
		d.addCallbacks(_done, _error)

		return self._complete

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

	def cancel (self, abort = False, propagate = False):
		if self.state in (State.RUNNING, State.PAUSED):
			if abort:
				self.state = State.ERROR
				propagate = True
			else:
				self.state = State.CANCELLED

			self._onResume = None

			# Send cancelled message to any parent block.
			try:
				if abort and self._complete.called is False:
					self._complete.errback(Aborted())
					self._complete = None
			except AttributeError:
				pass

			results = []

			# Propagate cancel call if required
			if propagate:
				try:
					results.append(self.nextBlock.cancel(abort, propagate))
				except (AttributeError, NotRunning):
					pass

			# Cancel the block execution
			results.append(defer.maybeDeferred(self._cancel, abort))

			# Cancel any inputs
			# (cancel without propagate affects only one block + inputs.)
			for block in self.inputs.itervalues():
				# Cancel all input children
				try:
					results.append(block.cancel(abort, propagate))
				except (AttributeError, NotRunning):
					pass
			return defer.DeferredList(results)

		# Pass on call to next block.
		elif (abort or propagate) and self.nextBlock is not None:
			if self.state is State.READY:
				self.state = State.CANCELLED

			return self.nextBlock.cancel(abort, propagate)

		# Bottom of stack, nothing was running
		# Or, this step is not running yet. Stop it from running.
		elif self.state is State.READY:
			self.state = State.CANCELLED

			return defer.succeed(None)

		# Nothing to do
		else:
			return defer.succeed(None)

	def _cancel (self, abort = False):
		pass

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
					# Something has gone wrong as the this block's state
					# should reflect those of its (input) children.
					# Try to cancel the child.
					results.append(block.cancel(propagate = True).addCallback(block.reset))

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
		events.append({ "type": "AddBlock", "data": { "id": self.id, "type": self.type, "fields": self.fields }})

		if self.mutation != "":
			events.append({ "type": "SetBlockMutation", "data": { "id": self.id, "mutation": self.mutation }})		

		if self.comment != "":
			events.append({ "type": "SetBlockComment", "data": { "id": self.id, "value": self.comment }})

		if self.outputBlock is not None:
			events.append({ "type": "ConnectBlock", "data": { "id": self.id, "connection": "input-value", "parent": self.outputBlock.id, "input": self.parentInput }})

		elif self.prevBlock is not None:
			if self.parentInput is not None:
				events.append({ "type": "ConnectBlock", "data": { "id": self.id, "connection": "input-statement", "parent": self.prevBlock.id, "input": self.parentInput }})
			else:
				events.append({ "type": "ConnectBlock", "data": { "id": self.id, "connection": "previous", "parent": self.prevBlock.id }})

		for child in self.getChildren():
			events.extend(child.toEvents())

		if self.disabled:
			events.append({ "type": "SetBlockDisabled", "data": { "id": self.id, "value": True }})

		if self.inputsInline is False:
			events.append({ "type": "SetBlockInputsInline", "data": { "id": self.id, "value": False }})

		# Collapsed should come after children
		if self.collapsed:
			events.append({ "type": "SetBlockCollapsed", "data": { "id": self.id, "value": True }})

		# Only move top blocks, and only once children have been added
		if self.outputBlock is None and self.prevBlock is None:
			events.append({ "type": "SetBlockPosition", "data": { "id": self.id, "x": self.position[0], "y": self.position[1] }})

		return events


def _toHyphenated (name):
	import re
	s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
	return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()

def _toUpperCamel (name):
	# We capitalize the first letter of each component except the first one
	# with the 'title' method and join them together.
	return "".join(map(str.capitalize, str(name).split('-')))

class Event (object):
	"""
	Events that can be applied to a workspace.
	"""

	jsProtocol = 'block'

	@classmethod
	def fromPayload (cls, action, payload):
		try:
			try:
				return cls.types[action](**payload)
			except AttributeError:
				cls.types = { c.jsTopic: c for c in cls.__subclasses__() }
				cls.types.update({ c.__name__: c for c in cls.__subclasses__() })
				return cls.types[action](**payload)
		except KeyError:
			raise UnknownEventError(_toUpperCamel(action))

	_fields = ()

	def __init__ (self, **fields):
		values = {}

		for f in self._fields:
			values[f] = fields[f] if f in fields else None

		self.values = values
		self.type = self.__class__.__name__

	def valuesWithEventId (self, event_id):
		values = self.values.copy()
		values['event'] = event_id
		return values

	def apply (self, workspace):
		pass

	def toJSON (self):
		import json
		return json.dumps({
			"type": self.type,
			"data": self.values
		})

class AddBlock (Event):
	_fields = ("id", "type", "fields", "x", "y")
	jsTopic = "created"

	def apply (self, workspace):
		workspace.addBlock(**self.values)

class RemoveBlock (Event):
	_fields = ("id", )
	jsTopic = "disposed"

	def apply (self, workspace):
		workspace.removeBlock(**self.values)

class ConnectBlock (Event):
	_fields = ("id", "connection", "parent", "input")
	jsTopic = "connected"

	def apply (self, workspace):
		workspace.connectBlock(**self.values)

class DisconnectBlock (Event):
	_fields = ("id", "connection", "parent", "input")
	jsTopic = "disconnected"

	def apply (self, workspace):
		workspace.disconnectBlock(**self.values)

class SetBlockPosition (Event):
	_fields = ("id", "x", "y")
	jsTopic = "set-position"

	def apply (self, workspace):
		block = workspace.getBlock(self.values['id'])
		block.position = [
			int(self.values['x'] or 0),
			int(self.values['y'] or 0)
		]

class SetBlockFieldValue (Event):
	_fields = ("id", "field", "value")
	jsTopic = "set-field-value"

	def apply (self, workspace):
		block = workspace.getBlock(self.values['id'])
		block.setFieldValue(self.values['field'], self.values['value'])

class SetBlockDisabled (Event):
	_fields = ("id", "value")
	jsTopic = "set-disabled"

	def apply (self, workspace):
		block = workspace.getBlock(self.values['id'])
		block.disabled = bool(self.values['value'])

class SetBlockCollapsed (Event):
	_fields = ("id", "value")
	jsTopic = "set-collapsed"

	def apply (self, workspace):
		block = workspace.getBlock(self.values['id'])
		block.collapsed = bool(self.values['value'])

class SetBlockComment (Event):
	_fields = ("id", "value")
	jsTopic = "set-comment"

	def apply (self, workspace):
		block = workspace.getBlock(self.values['id'])
		block.comment = str(self.values['value'])

class SetBlockInputsInline (Event):
	_fields = ("id", "value")
	jsTopic = "set-inputs-inline"

	def apply (self, workspace):
		block = workspace.getBlock(self.values['id'])
		block.inputsInline = bool(self.values['value'])

class SetBlockMutation (Event):
	_fields = ("id", "mutation")
	jsTopic = "set-mutation"

	def apply (self, workspace):
		block = workspace.getBlock(self.values['id'])
		block.mutation = self.values['mutation']

# Not Implemented:
# block-set-deletable (value)
# block-set-editable (value)
# block-set-movable (value)
# block-set-help-url (value)
# block-set-colour (value)
# block-set-comment (value)
# block-set-collapsed (value)

# Not Required
# block-add-input
# block-remove-input
# block-move-input

class UnknownEventError (Exception):
	pass

class Disconnected (Exception):
	pass

class Cancelled (Exception):
	pass

class Aborted (Cancelled):
	pass

populate_blocks()
