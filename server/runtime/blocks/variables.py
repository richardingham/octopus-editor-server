from ..workspace import Block, Disconnected, Cancelled

from twisted.internet import defer

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

		@self.on('value-changed')
		def onVarNameChanged (data):
			if not (data["block"] is self and data["field"] == 'NAME'):
				return

			if data["newValue"] == data["oldValue"]:
				return

			self.workspace.variables[self._varName(data["newValue"])] = \
				self.workspace.variables[self._varName(data["oldValue"])]

			del self.workspace.variables[self._varName(data["oldValue"])]

	@defer.inlineCallbacks
	def _run (self):
		input = self.inputs['VALUE']

		if len(input.getVariables()) > 0:
			raise Exception("Storing variables in globals is not currently supported.")

		try:
			result = yield input.eval()
		except Disconnected:
			result = None

		if result is None:
			raise Exception("Global declared value cannot be None")

		self.workspace.variables[self._varName()] = data.Variable(type(result), result)

	def disposed (self):
		del self.workspace.variables[ self._varName() ]

	def getDeclarationNames (self):
		return [ self._varName() ]


class lexical_variable (object):
	def _getVariable (self):
		name, attr = variableName(self.fields['VAR'])
		print "Searching for var %s -- %s %s" % (self.fields['VAR'], name, attr)

		try:
			variable = self.workspace.variables[name]
			print "Found var %s" % variable
		except AttributeError:
			raise Exception("Nonexistent variable {:s}".format(name))

		try:
			if attr is not None:
				for key in attr:
					variable = getattr(variable, key)
					print "Found subvar %s" % variable
		except AttributeError:
			raise Exception("Nonexistent attribute {:s} for variable {:s}".format(".".join(attr), name))

		return variable

	def getVariables (self):
		return [ self._getVariable() ]

	def getVariableNames (self):
		name, attr = variableName(self.fields['VAR'])
		return [ name ]


class lexical_variable_set (lexical_variable, Block):
	@defer.inlineCallbacks
	def _run (self):
		result = yield self.getInputValue("VALUE")
		yield self._getVariable().set(result)


class lexical_variable_get (lexical_variable, Block):
	def eval (self):
		variable = self._getVariable()
		print "returning value %s" % variable.value
		return defer.succeed(variable.value)


class math_change (lexical_variable, Block):
	def _run (self):
		add = 1 if self.getFieldValue("MODE") == 'INCREMENT' else -1 
		variable = self._getVariable()

		variable.set(variable.value + add)

		return defer.succeed(None)
