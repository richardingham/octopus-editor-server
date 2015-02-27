# Package imports
from ..workspace import Block, Disconnected, Cancelled, Aborted

# Octopus Imports
from octopus.constants import State

# Twisted Imports
from twisted.internet import reactor, defer
from twisted.internet.error import AlreadyCalled, AlreadyCancelled

# Python Imports
from time import time as now
import re


class controls_run (Block):
	pass


class controls_parallel (Block):
	@defer.inlineCallbacks
	def _run (self):
		inputs = [
			input for name, input in self.inputs.iteritems()
			if name[:5] == "STACK" and input is not None
		]

		def _error (failure):
			error = failure.trap(Cancelled, Disconnected)

			if error is Aborted:
				return failure

		runResults = defer.gatherResults(
			[input.run().addErrback(_error) for input in inputs],
			consumeErrors = True
		)

		yield runResults


class controls_if (Block):
	def _nextInput (self, i = -1):
		# Find the next input after IF{i}
		return next((
			(int(name[2:]), input) for name, input in self.inputs.iteritems()
			if input is not None and name[:2] == "IF" and int(name[2:]) > i
		), (None, None))

	@defer.inlineCallbacks
	def _run (self):
		i, input = self._nextInput()

		# Try each IF input, in ascending numerical order.
		while input is not None:
			try:
				result = yield input.eval()
			except (Cancelled, Disconnected):
				result = False

			# Attempt to run DO{i} if IF{i} was True.
			if result:
				try:
					action = self.getInput("DO" + str(i))
					yield action.run()
				except Disconnected:
					yield self.cancel()
				except (KeyError, Cancelled):
					pass

				# Skip any further conditions
				return

			# Move to the next condition
			i, input = self._nextInput(i)

		# Run the else clause if it exists.
		try:
			action = self.getInput("ELSE")
		except KeyError:
			action = None

		if action is not None:
			try:
				yield action.run()
			except Disconnected:
				yield self.cancel()
			except Cancelled:
				pass


class controls_log (Block):
	@defer.inlineCallbacks
	def _run (self):
		message = yield self.getInputValue("TEXT", "")

		self.workspace.emit(
			"log-message",
			level = "info",
			message = str(message)
		)


class controls_wait (Block):
	_wait_re = re.compile("(?:(\d+) *h(?:our(?:s)?)?)? *(?:(\d+) *m(?:in(?:ute(?:s)?)?)?)? *(?:(\d+) *s(?:ec(?:ond(?:s)?)?)?)? *(?:(\d+) *m(?:illi)?s(?:ec(?:ond(?:s)?)?)?)?", re.I)

	def __init__ (self, workspace, id):
		Block.__init__(self, workspace, id)

		self._c = None
		self._start = 0
		self._delay = 0

	def _run (self):
		complete = defer.Deferred()
		self.duration = None
		self._variables = []

		@defer.inlineCallbacks
		def _update (data = None):
			if self.state is not State.RUNNING:
				return

			time = yield self.getInputValue("TIME", 0)

			timeType = type(time)

			if timeType in (int, float):
				duration = time

			elif timeType in (str, unicode):
				match = self._wait_re.match(time);

				if match is None:
					raise Exception('{:s} is not a valid time string'.format(time))

				# Convert human-readable time to number of seconds
				match = [int(x or 0) for x in match.groups()]
				duration = \
					(match[0] * 3600) + \
					(match[1] * 60) + match[2] + \
					(match[3] * 0.001)

			else:
				raise Exception('{:s} is not a valid time'.format(time))

			if duration == self.duration:
				return
			else:
				self.duration = duration

			if not (self._c and self._c.active()):
				self._start = now()
				self._c = reactor.callLater(duration, _done)
			else:
				self._c.reset(max(0, duration - (now() - self._start)))

		def _tryUpdate (data = None):
			_update().addErrback(_error)

		def _setListeners (data = None):
			for v in self._variables:
				v.off('change', _tryUpdate)

			try:
				self._variables = set(self.getInput("TIME").getVariables())
			except (KeyError, AttributeError):
				self._variables = []

			for v in self._variables:
				v.on('change', _tryUpdate)

			_tryUpdate()

		def _removeListeners ():
			self.off("value-changed", _setListeners)
			self.off("connectivity-changed", _setListeners)

			for v in self._variables:
				v.off('change', _tryUpdate)

		def _done ():
			_removeListeners()
			complete.callback(None)

		def _error (failure = None):
			_removeListeners()

			try:
				self._c.cancel()
			except (AttributeError, AlreadyCalled, AlreadyCancelled):
				pass

			try:
				complete.errback(failure)
			except defer.AlreadyCalledError:
				pass

		self.on("value-changed", _setListeners)
		self.on("connectivity-changed", _setListeners)

		_setListeners()
		return complete

	def _pause (self):
		d = Block._pause(self)

		complete = self._c.func # i.e. _done
		self._c.cancel()
		remaining = self._c.getTime() - now()
		self._pauseTime = now()

		def on_resume ():
			self._delay += now() - self._pauseTime
			self._c = reactor.callLater(remaining, complete)

			# TODO: announce new delay of round(self._delay, 4))

		self._onResume = on_resume

		return d

	def _reset (self):
		return Block._reset(self)

		self._c = None
		self._start = 0
		self._delay = 0

	def _cancel (self, abort = False):
		# Cancel the timer, ignoring any error if the timer
		# doesn't exist or has finished already.
		try:
			complete = self._c.func # i.e. _done
			self._c.cancel()
			reactor.callLater(0, complete)
		except (AttributeError, AlreadyCalled, AlreadyCancelled):
			pass


class controls_wait_until (Block):
	def _run (self):
		complete = defer.Deferred()
		self._variables = []

		@defer.inlineCallbacks
		def runTest (data = None):
			if self.state is State.PAUSED:
				return
			elif self.state in (State.CANCELLED, State.ERROR):
				removeListeners()
				complete.callback(None)
				defer.returnValue(None)

			try:
				result = yield self.getInputValue("CONDITION", True)
			except Exception as e:
				removeListeners()
				complete.errback(e)
			else:
				if result == True:
					done()

		def setListeners (data):
			for v in self._variables:
				v.off('change', runTest)

			try:
				self._variables = set(self.getInput("CONDITION").getVariables())
			except AttributeError:
				self._variables = []

			for v in self._variables:
				v.on('change', runTest)

		def removeListeners ():
			self.off("connectivity-changed", setListeners)
			self.off("value-changed", runTest)

			for v in self._variables:
				v.off('change', runTest)

		def done ():
			removeListeners()
			complete.callback(None)

		self.on("connectivity-changed", setListeners)
		self.on("value-changed", runTest)
		setListeners(None)
		runTest(None)

		return complete


class controls_maketime (Block):
	def eval (self):
		hour = float(self.getFieldValue('HOUR'))
		minute = float(self.getFieldValue('MINUTE'))
		second = float(self.getFieldValue('SECOND'))

		return defer.succeed(hour * 3600 + minute * 60 + second)


class controls_whileUntil (Block):
	@defer.inlineCallbacks
	def _run (self):
		while True:
			condition = yield self.getInputValue('BOOL', False)
			if self.fields['MODE'] == "UNTIL":
				condition = (condition == False)

			if condition:
				try:
					input = self.getInput('DO')
					yield input.reset()
					yield input.run()
				except Disconnected:
					pass
				except Cancelled:
					break
			else:
				break


class controls_repeat_ext (Block):
	@defer.inlineCallbacks
	def _run (self):
		index = 0

		while True:
			# Recalculate count on each iteration.
			# I imagine this is expected if a simple number block is used,
			# but if variables are involved it may turn out to lead to
			# unexpected behaviour!
			count = yield self.getInputValue('TIMES', None)

			if count is None or index >= count:
				break

			try:
				input = self.getInput('DO')
				yield input.reset()
				yield input.run()
			except (Disconnected, Cancelled, AttributeError):
				pass

			index += 1
