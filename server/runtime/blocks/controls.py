from ..workspace import Block

from twisted.internet import reactor, defer
import twisted.internet.error

from time import time as now
import re

class controls_run (Block):
	pass


class controls_if (Block):
	def _getInput (self, type, i = ""):
		try:
			return self.inputs[type + str(i)]
		except KeyError:
			return None

	def _run (self):
		self.workspace.emit("started")
		self._complete = defer.Deferred()

		@defer.inlineCallbacks
		def _run ():
			i = 0
			input = self.getInput("IF", i)

			while input is not None:
				try:
					result = yield input.eval()
				except Disconnected:
					result = False

				if result:
					action = self._getInput("DO", i)
					try:
						yield action.run()
					except Disconnected:
						yield self.cancel()

					defer.returnValue()

				i += 1
				input = self._getInput("IF", i)

			action = self._getInput("ELSE")
			if action is not None:
				try:
					yield action.run()
				except Disconnected:
					yield self.cancel()

		def done (result):
			return self._runNext(self._complete)

		_run().addCallback(done)
		return self._complete


class controls_log (Block):
	def _run (self):
		#self.workspace.emit("started")
		self._complete = defer.Deferred()

		@defer.inlineCallbacks
		def _run ():
			message = yield self.getInputValue("TEXT")
			self.workspace.emit(
				"log-message", 
				level = "info", 
				message = str(message)
			)

		def done (result):
			return self._runNext(self._complete)

		_run().addCallback(done)
		return self._complete


class controls_wait (Block):
	_wait_re = re.compile("(?:(\d+) *h(?:our(?:s)?)?)? *(?:(\d+) *m(?:in(?:ute(?:s)?)?)?)? *(?:(\d+) *s(?:ec(?:ond(?:s)?)?)?)? *(?:(\d+) *m(?:illi)?s(?:ec(?:ond(?:s)?)?)?)?", re.I)

	def __init__ (self, workspace, id):
		Block.__init__(self, workspace, id)

		self._c = None
		self._start = 0
		self._delay = 0

	def _run (self):
		#self.workspace.emit("started")
		self._complete = defer.Deferred()

		@defer.inlineCallbacks
		def _run ():
			time = yield self.getInputValue("TIME")
			timeType = type(time)

			if timeType in (int, float):
				self.duration = time

			elif timeType is str:
				match = _wait_re.match(self._expr.value);

				if match is None:
					raise Error('{:s} is not a valid time'.format(time))

				# Convert human-readable time to number of seconds
				match = [int(x or 0) for x in match.groups()]
				self.duration = \
					(match[0] * 3600) + \
					(match[1] * 60) + match[2] + \
					(match[3] * 0.001)

			else:
				raise Error('{:s} is not a valid time'.format(time))

			self._start = now()
			self._c = reactor.callLater(self.duration, done)

		def done (result = None):
			return self._runNext(self._complete)

		_run()
		return self._complete

	def _pause (self):
		d = Block._pause(self)

		complete = self._c.func
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
		# Try to cancel the timer - ignore any errors.
		try:
			self._c.cancel()
		except (
			AttributeError,
			twisted.internet.error.AlreadyCalled,
			twisted.internet.error.AlreadyCancelled
		):
			pass

		return Block._cancel(self, abort)


class controls_wait_until (Block):
	def _run (self):
		#self.workspace.emit("started")

		self._complete = defer.Deferred()
		self._variables = []

		def handleResult (result):
			if result == True:
				done()

		def runTest (data):
			self.getInputValue("CONDITION").addCallback(handleResult)

		def onConnectivityChange (data):
			for v in self._variables:	
				v.off('change', runTest)

			try:
				self._variables = self.getInput("VALUE").getVariables()
			except AttributeError:
				self._variables = []

			for v in self._variables:	
				v.on('change', runTest)

		def done (result):
			self.off("connectivity-changed", onConnectivityChange)
			self.off("value-changed", runTest)

			for v in self._variables:	
				v.off('change', runTest)

			return self._runNext(self._complete)

		self.on("connectivity-changed", onConnectivityChange)
		self.on("value-changed", runTest)
		onConnectivityChange(None)
		runTest(None)

		return self._complete


class controls_whileUntil (Block):
	def _run (self):
		#self.workspace.emit("started")
		self._complete = defer.Deferred()

		@defer.inlineCallbacks
		def _iter ():
			while True:
				try:
					condition = yield self.getInput.eval()
					if self.fields['MODE'] == "UNTIL":
						condition = (condition == False)
				except Disconnected:
					condition = (self.fields['MODE'] == "UNTIL")

				if condition:
					try:
						yield self.getInput('DO').run()
					except Disconnected:
						pass
				else:
					break

		def done (result):
			return self._runNext(self._complete)

		_run().addCallback(done)
		return self._complete


class controls_repeat_ext (Block):
	def _run (self):
		#self.workspace.emit("started")
		self._complete = defer.Deferred()

		@defer.inlineCallbacks
		def _iter ():
			index = 0

			while True:
				# Recalculate count on each iteration. 
				# I imagine this is expected if a simple number block is used,
				# but if variables are involved it may turn out to lead to
				# unexpected behaviour!
				count = yield self.getInputValue('TIMES')

				if count is None or index >= count:
					break

				try:
					yield self.getInput('DO').run()
				except Disconnected:
					pass

				index += 1

		def done (result):
			return self._runNext(self._complete)

		_run().addCallback(done)
		return self._complete
