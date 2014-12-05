from ..workspace import Block, Disconnected, Cancelled

from twisted.internet import defer
from twisted.python import log

from octopus import data
from octopus.constants import State


def variableName (name):
	split = name.split('::')
	
	if len(split) is 2:
		return (split[0] + "::" + split[1], None)
	elif len(split) is 3:
		return (split[0] + "::" + split[1], split[2].split('.'))
	else:
		raise Exception("Invalid variable name {:s}".format(name))


class global_declaration (Block):
	def _varName (self, name = None):
		return "global.global::" + (name or self.fields['NAME'])

	def created (self):
		self.workspace.variables[self._varName()] = None
		self._variables = []

		# Deal with name changes
		@self.on('value-changed')
		def onVarNameChanged (data):
			if not (data["block"] is self and data["field"] == 'NAME'):
				self._onConnectivityChanged()
				self._onChange()
				return

			if data["newValue"] == data["oldValue"]:
				return

			self.workspace.variables[self._varName(data["newValue"])] = \
				self.workspace.variables[self._varName(data["oldValue"])]

			del self.workspace.variables[self._varName(data["oldValue"])]

		self.on('connectivity-changed', self._onConnectivityChanged)
		self._onConnectivityChanged()

	# Set up event listeners whenever connections change 
	def _onConnectivityChanged (self, data = None):
		for v in self._variables:
			v.off('change', self._onChange)

		try:
			self._variables = set(self.getInput('VALUE').getVariables())
		except (KeyError, AttributeError):
			self._variables = []

		for v in self._variables:
			v.on('change', self._onChange)

	# Handle any changes in variables
	@defer.inlineCallbacks
	def _onChange (self, data = None):
		if self.workspace.state not in (State.RUNNING, State.PAUSED):
			return

		try:
			result = yield self.getInput('VALUE').eval()
		except (KeyError, AttributeError, Disconnected):
			return

		try:
			variable = self.workspace.variables[self._varName()]
		except KeyError:
			return

		try:
			yield variable.set(result)
		except AttributeError:
			pass
		except:
			log.err()

	@defer.inlineCallbacks
	def _run (self):
		try:
			result = yield self.getInput('VALUE').eval()
		except (KeyError, AttributeError, Disconnected):
			result = None

		if result is None:
			raise Exception("Global declared value cannot be None")

		variable = data.Variable(type(result), result)
		variable.alias = self.fields['NAME']
		self.workspace.variables[self._varName()] = variable

		self._onConnectivityChanged()

	def disposed (self):
		for v in self._variables:
			v.off('change', self._onChange)

		del self.workspace.variables[ self._varName() ]

	def getDeclarationNames (self):
		variables = [ self._varName() ]

		for block in self.getChildren():
			variables.extend(block.getDeclarationNames())

		return variables


class lexical_variable (object):
	def _getVariable (self):
		name, attr = variableName(self.fields['VAR'])

		try:
			variable = self.workspace.variables[name]
		except AttributeError:
			raise Exception("Nonexistent variable {:s}".format(name))

		try:
			if attr is not None:
				for key in attr:
					variable = getattr(variable, key)
		except AttributeError:
			raise Exception("Nonexistent attribute {:s} for variable {:s}".format(".".join(attr), name))

		return variable

	def getVariables (self):
		variable = self._getVariable()

		if variable is not None:
			variables = [ variable ]
		else:
			variables = []

		for block in self.getChildren():
			variables.extend(block.getVariables())

		return variables

	def getVariableNames (self):
		name, attr = variableName(self.fields['VAR'])
		variables = [ name ]

		for block in self.getChildren():
			variables.extend(block.getVariableNames())

		return variables


class lexical_variable_set (lexical_variable, Block):
	@defer.inlineCallbacks
	def _run (self):
		result = yield self.getInputValue("VALUE")
		yield self._getVariable().set(result)


class lexical_variable_get (lexical_variable, Block):
	def eval (self):
		variable = self._getVariable()
		return defer.succeed(variable.value)


class math_change (lexical_variable, Block):
	def _run (self):
		add = 1 if self.getFieldValue("MODE") == 'INCREMENT' else -1 
		variable = self._getVariable()

		variable.set(variable.value + add)

		return defer.succeed(None)
