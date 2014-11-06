from ..protocol.sketch import SketchProtocol
from ..protocol.runtime import RuntimeProtocol

# This is the class all runtime implementations can extend to easily wrap
# into any transport protocol.
class BaseTransport (object):
	def __init__ (self, options = None):
		self.options = options or {}
		self.version = '0.1'
		self.runtime = RuntimeProtocol(self)
		self.sketch = SketchProtocol(self)
		self.context = None

	def send (self, protocol, topic, payload, context):
		"""Send a message back to the user via the transport protocol.
		Each transport implementation should provide their own implementation
		of this method.
		The context is usually the context originally received from the
		transport with the request. For example, a specific socket connection.
		@param [str] Name of the protocol
		@param [str] Topic of the message
		@param [dict] Message payload
		@param [Object] Message context, dependent on the transport
		"""

		raise NotImplementedError
	 
	def receive (self, protocol, topic, payload, context):
		"""Handle incoming message
		This is the entry-point to actual protocol handlers. When receiving
		a message, the runtime should call this to make the requested actions
		happen
		The context is originally received from the transport. For example, 
		a specific socket connection. The context will be utilized when 
		sending messages back to the requester.
		@param [str] Name of the protocol
		@param [str] Topic of the message
		@param [dict] Message payload
		@param [Object] Message context, dependent on the transport
		"""

		self.context = context

		if protocol == 'runtime':
			return self.runtime.receive(topic, payload, context)
		if protocol == 'sketch':
			return self.sketch.receive(topic, payload, context)

	def disconnected (self, context):
		"""Handle client disconnection
		@param [Object] Message context, dependent on the transport
		"""

		self.sketch.disconnected(context)
