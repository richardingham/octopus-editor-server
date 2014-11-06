import uuid
import os
import json
from datetime import datetime as now

from twisted.internet import defer, threads
from twisted.python.filepath import FilePath

from util import EventEmitter


class Experiment (EventEmitter):

	def __init__ (self, sketch):
		self.sketch = sketch
		self.workspace = sketch.workspace

	def run (self):
		sketch.subscribe(self, self.onSketchEvent)

	def onSketchEvent (self, event, payload):
		self._writeSketchEvent(event, payload)

	def _writeSketchEvent (self, eventType, data):
		if not self.loaded:
			raise Error("Sketch is not loaded")

		self._eventIndex += 1

		event = {
			"index": self._eventIndex,
			"type": eventType,
			"data": data
		}

		self._eventsLog.write(json.dumps(event) + "\n")

		return self._eventIndex
