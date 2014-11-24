from ..workspace import Block, Disconnected, Cancelled
from variables import lexical_variable

from octopus.constants import State
from octopus.sequence.error import NotRunning, AlreadyRunning

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


class controls_statemonitor (Block):
	_triggered = False
	cancel_on_trigger = True
	cancel_on_reset = True
	auto_reset = True

	def _run (self):
		self._run_complete = defer.Deferred()
		self._variables = []

		self.on("connectivity-changed", self.setListeners)
		self.on("value-changed", self.runUpdate)
		self.setListeners(None)
		self.runUpdate(None)

		return self._run_complete

	@defer.inlineCallbacks
	def runUpdate (self, data = None):
		if self.state is State.PAUSED:
			self._onResume = self.runUpdate
			defer.returnValue(None)
		elif self.state is not State.RUNNING:
			defer.returnValue(None)

		inputValues = [
			input.eval() 
			for name, input in self.inputs.iteritems() 
			if input is not None and name[:4] == "TEST"
		]
		results = yield defer.DeferredList(inputValues, consumeErrors = True)

		ok = True
		for success, result in results:
			if success:
				ok &= bool(result)
			else:
				# Ignore if Disconnected or Cancelled.
				# TODO: log a warning if an exception.
				pass

		# If the monitor is already triggered, check if we need to reset.
		if self._triggered and self.auto_reset and ok:
			self.resetTrigger()

		# Check if the monitor should be triggered.
		elif not ok:
			# Cancel reset_step
			try:
				if self.cancel_on_trigger:
					self.inputs['RESET'].cancel(propagate = True)
			except (KeyError, AttributeError, NotRunning) as e:
				print e.__class__.__name__
				pass

			# Run trigger_step
			try:
				self.inputs['TRIGGER'].reset()
				self.inputs['TRIGGER'].run()
			except (KeyError, AttributeError, AlreadyRunning):
				return

			self._triggered = True

	def resetTrigger (self, run_reset_step = True):
		self._triggered = False

		if self.cancel_on_reset:
			try:
				self.inputs['TRIGGER'].cancel(propagate = True)
			except (KeyError, AttributeError, NotRunning):
				pass

		if run_reset_step:
			try:
				self.inputs['RESET'].reset()
				self.inputs['RESET'].run()
			except (KeyError, AttributeError, AlreadyRunning):
				return

	def setListeners (self, data):
		for v in self._variables:	
			v.off('change', self.runUpdate)

		self._variables = []
		inputs = [
			input 
			for name, input in self.inputs.iteritems() 
			if input is not None and name[:4] == "TEST"
		]
		for input in inputs:
			try:
				self._variables.extend(input.getVariables())
			except AttributeError:
				pass

		for v in self._variables:	
			v.on('change', self.runUpdate)

	def removeListeners (self):
		self.off("connectivity-changed", self.setListeners)
		self.off("value-changed", self.runUpdate)

		for v in self._variables:	
			v.off('change', self.runUpdate)

	def _cancel (self, abort = False):
		self.removeListeners()
		self._run_complete.callback(None)

