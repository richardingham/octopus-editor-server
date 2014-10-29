from ..workspace import Block 


class controls_run (Block):
	pass


class controls_if (Block):
	def _getInput (self, type, i = ""):
		try:
			return self.inputs[type + str(i)]
		except KeyError:
			return None

	def run (self):
		self.emit("started")

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
		self.emit("started")

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
		self.emit("started")

		@defer.inlineCallbacks
		def _run ():
			time = yield self.getInputValue("TIME")

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete


class controls_wait_until (Block):
	def run (self):
		self.emit("started")

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

		def done ():
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
	def run (self):
		self.emit("started")

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

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete


class controls_repeat_ext (Block):
	def run (self):
		self.emit("started")

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

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete
