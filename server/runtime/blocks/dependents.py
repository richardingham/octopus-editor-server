from ..workspace import Block, Disconnected, Cancelled
from octopus.constants import State
from variables import lexical_variable

from twisted.internet import reactor, defer
import twisted.internet.error

from time import time as now
import re


class controls_dependents (Block):
	@defer.inlineCallbacks
	def _run (self):
		stack = self.getInput("STACK")
		inputs = [input for name, input in self.inputs.iteritems() if input is not None and name[:3] == "DEP"]

		if stack is None:
			defer.returnValue(None)

		for input in inputs:
			input.run()

		yield stack.run()

		yield defer.gatherResults([input.cancel() for input in inputs])


class controls_bind (lexical_variable, Block):
	def _run (self):
		complete = defer.Deferred()
		variable = self._getVariable()
		self._variables = []

		@defer.inlineCallbacks
		def runUpdate (data = None):
			if self.state is State.PAUSED:
				return
			elif self.state in (State.CANCELLED, State.ERROR):
				removeListeners()
				complete.callback(None)
				defer.returnValue(None)

			try:
				result = yield self.getInputValue("VALUE")
				variable.set(result)
			except Disconnected:
				# Handled by setListeners
				pass
			except Cancelled as e:
				removeListeners()
				complete.errback(e)
			except Exception as e:
				removeListeners()
				complete.errback(e)

		def setListeners (data):
			for v in self._variables:	
				v.off('change', runUpdate)

			try:
				self._variables = self.getInput("VALUE").getVariables()
			except AttributeError:
				self._variables = []

			for v in self._variables:	
				v.on('change', runUpdate)

		def removeListeners ():
			self.off("connectivity-changed", setListeners)
			self.off("value-changed", runUpdate)

			for v in self._variables:	
				v.off('change', runUpdate)

		self.on("connectivity-changed", setListeners)
		self.on("value-changed", runUpdate)
		setListeners(None)
		runUpdate(None)

		return complete
