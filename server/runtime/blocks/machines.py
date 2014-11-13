from ..workspace import Block, Disconnected, Cancelled

from twisted.internet import reactor, defer, task

from octopus import data
from octopus.constants import State
import octopus.transport.basic


class machine_declaration (Block):
	def _varName (self, name = None):
		return "global.machine::" + (name or self.fields['NAME'])

	def created (self):
		self.workspace.variables[self._varName()] = None

		@self.on('value-changed')
		def onVarNameChanged (data):
			if not (data["block"] is self and data["field"] == 'NAME'):
				return

			self.workspace.variables[self._varName(data["newValue"])] = \
				self.workspace.variables[self._varName(data["oldValue"])]

			del self.workspace.variables[self._varName(data["oldValue"])]

	def _run (self):
		@defer.inlineCallbacks
		def _connect ():
			input = self.inputs['CONNECTION']

			try:
				connection = yield input.eval()
			except Disconnected:
				connection = None

			if connection is None:
				raise Exception("Connection must be specified for machine {:s}".format(self.fields['NAME']))

			cls = self.getMachineClass()
			self.machine = cls(connection, alias = self.fields['NAME'])
			self.workspace.variables[self._varName()] = self.machine

			self.machine.ready.addCallbacks(_done, _error)

		def _done (result):
			print "Machine block: connection complete to " + str(self.machine)

			self.workspace.on("workspace-stopped", self._onWorkspaceStopped)
			self.workspace.on("workspace-paused", self._onWorkspacePaused)
			self.workspace.on("workspace-resumed", self._onWorkspaceResumed)

			# Short delay to allow the machine to get its first data
			# TODO - machines should only return ready when they
			# have received their first data.
			return task.deferLater(reactor, 2, lambda: result)

		def _error (failure):
			print "Machine connection error: " + str(failure)
			return failure

		return _connect().addCallbacks(_done, _error)

	def _onWorkspaceStopped (self, data):
		print "Machine block: terminating connection to " + str(self.machine)

		self.workspace.off("workspace-stopped", self._onWorkspaceStopped)
		self.workspace.off("workspace-paused", self._onWorkspacePaused)
		self.workspace.off("workspace-resumed", self._onWorkspaceResumed)

		self.machine.stop()

		# Allow some time for any remaining messages to be received.
		reactor.callLater(2, self.machine.protocol.transport.loseConnection)
		self.machine = None

	def _onWorkspacePaused (self, data):
		self.machine.pause()

	def _onWorkspaceResumed (self, data):
		self.machine.resume()

	def disposed (self):
		del self.workspace.variables[self._varName()]

	def getMachineClass (self):
		raise NotImplementedException

	def getDeclarationNames (self):
		return [ self._varName() ]


class machine_vapourtec_R2R4 (machine_declaration):
	def getMachineClass (self):
		from octopus.manufacturer import vapourtec
		return vapourtec.R2R4


class machine_knauer_K120 (machine_declaration):
	def getMachineClass (self):
		from octopus.manufacturer import knauer
		return knauer.K120


class machine_knauer_S100 (machine_declaration):
	def getMachineClass (self):
		from octopus.manufacturer import knauer
		return knauer.S100


class machine_vici_multivalve (machine_declaration):
	def getMachineClass (self):
		from octopus.manufacturer import vici
		return vici.MultiValve


class connection_tcp (Block):
	def eval (self):
		return octopus.transport.basic.tcp(
			str(self.fields['HOST']), 
			int(self.fields['PORT'])
		)


class connection_serial (Block):
	def eval (self):
		return octopus.transport.basic.serial(
			str(self.fields['PORT']), 
			baudrate = int(self.fields['BAUD'])
		)

