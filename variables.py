
class global_declaration (Block):
	def created (self):
		self.workspace.variables[self.fields['NAME']] = Variable()

	def run (self):
		@defer.inlineCallbacks
		def _run ():
			try:
				result = yield input.eval()
			except Disconnected:
				result = False

			self.workspace.variables[self.fields['NAME']].set(result)

		# There will be no next block.
		self._complete = _run()
		return self._complete

	def disposed (self):
		del self.workspace.variables[self.fields['NAME']]


class variables_set (Block):
	def run (self):
		@defer.inlineCallbacks
		def _run ():
			result = yield self.getInputValue("VALUE")
			self.workspace.variables[self.fields['NAME']].set(result)

		def done ():
			return self._runNext(self._complete)

		self._complete = _run().addCallback(done)
		return self._complete


class variables_get (Block):
	def eval (self):
		# TODO: won't work with attributes
		return defer.succeed(self.workspace.variables[self.fields['NAME']]).value

	def getVariables (self):
		return [ self.workspace.variables[self.fields['NAME']] ]

