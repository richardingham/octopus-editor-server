from ..workspace import Block, Disconnected, Cancelled

from twisted.internet import reactor, defer
import twisted.internet.error

from time import time as now
import re


class controls_dependents (Block):
	@defer.inlineCallbacks
	def _run (self):
		stack = self._getInput("STACK", i)
		inputs = [input for name, input in self.inputs.itervalues() if input is not None and name[:3] == "DEP"]

		if stack is None:
			defer.returnValue(None)

		for input in inputs:
			input.run()

		yield stack.run()

		cancel = []
		for input in inputs:
			cancel.append(input.cancel())

		yield defer.gatherResults(cancel)

