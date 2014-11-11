import uuid
import os
import json
import time

now = time.time # shortcut

from twisted.internet import defer, threads
from twisted.python.filepath import FilePath

from octopus.sequence.error import AlreadyRunning, NotRunning

from util import EventEmitter


class Experiment (EventEmitter):
	""" This object is the representation of a running experiment, 
	stored in the database and in the event store. """

	db = None
	dataDir = None

	def __init__ (self, sketch):
		id = str(uuid.uuid4())

		self.id = id
		self.sketch = sketch

	@defer.inlineCallbacks
	def run (self):
		id = self.id
		sketch = self.sketch
		sketch_id = sketch.id
		workspace = sketch.workspace

		try:
			yield workspace.reset()
		except AlreadyRunning:
			yield workspace.abort()
			yield workspace.reset()

		self.startTime = now()

		# Insert the new experiment into the DB
		yield self.db.runOperation("""
				INSERT INTO experiments 
				(guid, sketch_guid, user_id, started_date) 
				VALUES (?, ?, ?, ?)
			""", 
			(id, sketch_id, 1, self.startTime)
		)

		stime = time.gmtime(self.startTime)

		self._experimentDir = FilePath(self.dataDir)
		for segment in [stime.tm_year, stime.tm_mon, stime.tm_mday, id]:
			self._experimentDir = self._experimentDir.child(str(segment))
			if not self._experimentDir.exists():
				self._experimentDir.createDirectory()

		eventFile = self._experimentDir.child("events.log").create()
		sketchFile = self._experimentDir.child("sketch.log").create()
		snapFile = self._experimentDir.child("sketch.snapshot.log")

		with snapFile.create() as fp:
			fp.write("\n".join(map(json.dumps, workspace.toEvents())))

		sketch.subscribe(self, self._writeSketchEvent)

		# Subscribe to workspace events
		@workspace.on("block-state")
		def onBlockStateChange (data):
			data['sketch'] = sketch_id
			data['experiment'] = id
			sketch.notifySubscribers("block-state", data, self)

		@workspace.on("log-message")
		def onLogMessage (data):
			data['sketch'] = sketch_id
			data['experiment'] = id
			sketch.notifySubscribers("experiment-log", data, self)

			# Store message in log file

		# (log all data change events)

		try:
			yield workspace.run()
		finally:
			sketch.unsubscribe(self)
			workspace.off("block-state", onBlockStateChange)
			workspace.off("log-message", onLogMessage)
			eventFile.close()
			sketchFile.close()

	def pause (self):
		return self.sketch.workspace.pause()

	def resume (self):
		return self.sketch.workspace.resume()

	def stop (self):
		return self.sketch.workspace.abort()

	def _writeSketchEvent (self, eventType, data):
		if eventType == "block-state":
			return

		time = now()

		event = {
			"time": time,
			"relative": time - self.startTime,
			"type": eventType,
			"data": data
		}

		self._sketchLog.write(json.dumps(event) + "\n")
