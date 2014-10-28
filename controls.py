
class controls_run (Block):
	pass

class controls_if (Block):
	def _getInput (self, type, i = ""):
		try:
			return self.inputs[type + str(i)]
		except KeyError:
			return None

	def run (self):
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

					returnValue()

				i += 1
				input = self._getInput("IF", i)

			action = self._getInput("ELSE")
			if action is not None:
				try:
					yield action.run()
				except Disconnected:
					yield self.cancel()

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete


class controls_log (Block):
	def run (self):
		@defer.inlineCallbacks
		def _run ():
			message = yield self.getInputValue("TEXT")
			self.workspace.emit("log-message", level = "info", message = message)

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete


class controls_wait (Block):
	def run (self):
		@defer.inlineCallbacks
		def _run ():
			time = yield self.getInputValue("TIME")

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete


class controls_wait_until (Block):
	def run (self):
		@defer.inlineCallbacks
		def _run ():
			# !!!! Needs to set an event??
			variables = self.getInput("VALUE").getVariables()
			condition = yield self.getInputValue("CONDITION")

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete


class controls_whileUntil (Block):
	def run (self):
		@defer.inlineCallbacks
		def _iter ():
			while True:
				try:
					condition = yield self.getInput.eval()
					if self.fields['MODE'] == "UNTIL":
						condition = condition == False
				except Disconnected:
					condition = self.fields['MODE'] == "UNTIL"

				if condition:
					try:
						yield self.getInput('DO').run()
					except Disconnected:
						pass

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete


class controls_repeat_ext (Block):
	def run (self):
		@defer.inlineCallbacks
		def _iter ():
			count = yield self.getInputValue('TIMES')
			index = 0

			if count is not None:
				while index < count:
					try:
						yield self.getInput('DO').run()
					except Disconnected:
						pass

					index++

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete
