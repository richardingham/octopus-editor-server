from ..runtime.workspace import Workspace
from ..sketch import Sketch

import copy
from collections import defaultdict

from twisted.internet import reactor

class SketchProtocol (object):
	def __init__ (self, transport):
		self.transport = transport
		self.sketches = {}

	def send (self, topic, payload, context):
		self.transport.send('sketch', topic, payload, context)

	def receive (self, topic, payload, context):
		if topic == 'sketch-load':
			return self.loadSketch(payload, context)

		try:
			# Find locally stored sketch by ID
			sketch = self.resolveSketch(payload)

			# Block commands
			if topic == 'block-created':
				return sketch.addBlock(args(payload, ["block", "fields", "type"], True), context)

			elif topic == 'block-disposed':
				return sketch.removeBlock(args(payload, ["block"], True), context)

			elif topic == 'block-changed':
				return sketch.changeBlock(args(payload, ["block", "change", "x", "y", "field", "value", "name"], 2), context)

			elif topic == 'block-connected':
				return sketch.connectBlock(args(payload, ["block", "parent", "connection", "input"], 3), context)

			elif topic == 'block-disconnected':
				return sketch.disconnectBlock(args(payload, ["block", "parent", "connection", "input"], 3), context)

			# Sketch commands
			elif topic == 'sketch-rename':	
				return sketch.renameSketch(args(payload, ["name"], True), context)

			# Experiment commands
			elif topic == 'experiment-run':
				return sketch.runExperiment(context)
			elif topic == 'experiment-pause':
				return sketch.pauseExperiment(context)
			elif topic == 'experiment-resume':
				return sketch.resumeExperiment(context)
			elif topic == 'experiment-stop':
				return sketch.stopExperiment(context)

		except Error as e:
			self.send('error', e, context)
			return

	def resolveSketch (self, payload):
		if "sketch" not in payload:
			raise Error('No sketch specified')

		id = payload["sketch"]

		if id not in self.sketches:
			raise SketchNotLoaded('Requested sketch not found')

		return self.sketches[id]

	def loadSketch (self, payload, context):
		if "sketch" not in payload:
			raise Error('No sketch ID provided')

		id = payload["sketch"]

		def _onEvent (event, payload):
			# is id already in the data?
			payload['sketch'] = id
			self.send(event, payload, context)	

		def _sendData (sketch):
			sketchData = {
				"sketch": sketch.id,
				"title": sketch.title,
				"events": sketch.workspace.toEvents()
			}
			self.send('sketch-load', sketchData, context)

		try:
			sketch = self.resolveSketch(payload)
			sketch.subscribe(context, _onEvent)
			return _sendData(sketch)

		except SketchNotLoaded:
			pass

		def _done (data):
			self.sketches[id] = sketch
			sketch.subscribe(context, _onEvent)
			return _sendData(sketch)

		def _error (failure):
			self.send('error', str(failure), context)

		sketch = Sketch(id)

		@sketch.on("closed")
		def onSketchClosed (data):
			# This must be performed later to avoid an exception 
			# in sketches.iteritems() in disconnected() 
			def _del ():
				del self.sketches[id]

			reactor.callLater(0, _del)

		return sketch.load().addCallbacks(_done, _error)

	def disconnected (self, context):
		for id, sketch in self.sketches.iteritems():
			sketch.unsubscribe(context)


def args (payload, keys, required = None, errorMsg = None, asList = False):
	new = [] if asList else {}
	keys = list(keys)

	if required in (None, False):
		required = []
	elif required is True:
		required = keys
	elif type(required) is not list:
		required = keys[:required]

	def set (key, value):
		if asList:
			new.append(value)
		else:
			new[key] = value

	for key in keys:
		try:
			child = None

			if "." in key:
				parent, child = key.split(".", 1)
				set(child, payload[parent][child])
			else:
				set(key, payload[key])

		except (KeyError, TypeError):
			if key in required:
				raise Error(errorMsg or ("Required parameter '%s' not supplied" % key))
			else:
				set(child or key, None)

	return new


class Error (Exception):
	pass

class SketchNotLoaded (Error):
	pass

