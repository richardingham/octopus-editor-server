from ..workspace import Block, Disconnected, Cancelled

try:
	import SimpleCV
	SimpleCVImage = SimpleCV.ImageClass.Image
except:
	# If SimpleCV is not installed then no need
	# to test whether variables are images.
	SimpleCVImage = None

from twisted.internet import defer
from twisted.python import log

from octopus import data
from octopus.constants import State
from octopus.image.data import DerivedImage


def variableName (name):
	split = name.split('::')

	if len(split) is 2:
		return (split[0] + "::" + split[1], None)
	elif len(split) is 3:
		return (split[0] + "::" + split[1], split[2].split('.'))
	else:
		raise InvalidVariableNameError(name)

class InvalidVariableNameError (Exception):
	""" Raised by variableName """


class global_declaration (Block):
	def _varName (self, name = None):
		return "global.global::" + (name or self.fields['NAME'])

	def created (self):
		self._variables = []

		# Deal with name changes
		@self.on('value-changed')
		def onVarNameChanged (data):
			if not (data["block"] is self and data["field"] == 'NAME'):
				self._onConnectivityChanged()
				self._onChange()
				return

			self.workspace.variables.rename(data["oldValue"], data["newValue"])

		self.on('connectivity-changed', self._onConnectivityChanged)
		self._onConnectivityChanged()

	# Set up event listeners whenever connections change
	def _onConnectivityChanged (self, data = None):
		for v in self._variables:
			v.off('change', self._onChange)

		try:
			self._variables = set(self.getInput('VALUE').getReferencedVariables())
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
		except (KeyError, AttributeError, Disconnected, Cancelled):
			return

		variable = self.workspace.variables[self._varName()]

		try:
			yield variable.set(result)
		except AttributeError:
			pass
		except:
			log.err()

	@defer.inlineCallbacks
	def _run (self):
		result = yield self.getInputValue('VALUE', None)

		if result is None:
			try:
				resultType = self.getInput('VALUE').outputType
			except (KeyError, AttributeError):
				raise Exception("Global declared value cannot be None")
		else:
			resultType = type(result)

		# Special handling if the variable is an image.
		if SimpleCVImage is not None \
		and resultType.__name__ == "instance" \
		and result.__class__ is SimpleCVImage:
			variable = DerivedImage()
		else:
			variable = data.Variable(resultType)

		variable.alias = self.fields['NAME']
		self.workspace.variables[self._varName()] = variable

		if result is not None:
			yield variable.set(result)

		self._onConnectivityChanged()

	def disposed (self):
		for v in self._variables:
			v.off('change', self._onChange)

		self.workspace.variables.remove(self._varName())

	def getGlobalDeclarationNames (self):
		variables = [ self._varName() ]

		for block in self.getChildren():
			variables.extend(block.getGlobalDeclarationNames())

		return variables


class lexical_variable (object):
	def _getVariable (self):
		try:
			name, attr = variableName(self.fields['VAR'])
			variable = self.workspace.variables[name]
		except (InvalidVariableNameError, KeyError):
			return None

		try:
			if attr is not None:
				for key in attr:
					variable = getattr(variable, key)
		except AttributeError:
			return None

		return variable

	def getReferencedVariables (self):
		variable = self._getVariable()

		if variable is not None:
			variables = [ variable ]
		else:
			variables = []

		for block in self.getChildren():
			variables.extend(block.getReferencedVariables())

		return variables

	def getReferencedVariableNames (self):
		name, attr = variableName(self.fields['VAR'])
		variables = [ name ]

		for block in self.getChildren():
			variables.extend(block.getReferencedVariableNames())

		return variables

	getUnmatchedVariableNames = getReferencedVariableNames

class lexical_variable_set (lexical_variable, Block):
	@defer.inlineCallbacks
	def _run (self):
		result = yield self.getInputValue("VALUE")
		variable = self._getVariable()
		yield self._setVariable(variable, result)

	@defer.inlineCallbacks
	def _setVariable (self, variable, value):
		if variable is None:
			self.emitLogMessage(
				"Cannot set unknown variable: " + str(self.fields['VAR']),
				"error"
			)
			return

		try:
			yield variable.set(value)
		except Exception as error:
			self.emitLogMessage(str(error), "error")


class lexical_variable_get (lexical_variable, Block):
	def eval (self):
		try:
			variable = self._getVariable()
			self.outputType = variable.type
			return defer.succeed(variable.value)
		except (AttributeError):
			self.emitLogMessage(
				"Unknown variable: " + str(self.fields['VAR']),
				"error"
			)

			return defer.succeed(None)


class math_change (lexical_variable_set, Block):
	def _run (self):
		add = 1 if self.getFieldValue("MODE") == 'INCREMENT' else -1
		variable = self._getVariable()
		return self._setVariable(variable, variable.value + add)
