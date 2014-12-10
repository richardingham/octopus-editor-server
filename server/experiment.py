# Python Imports
import uuid
import os
import json
import time
import re

now = time.time # shortcut

# Twisted Imports
from twisted.internet import defer, threads, task
from twisted.python import log
from twisted.python.filepath import FilePath

# Octopus Imports
from octopus.sequence.error import AlreadyRunning, NotRunning

# Package Imports
from util import EventEmitter


class Experiment (EventEmitter):
	""" This object is the representation of a running experiment, 
	stored in the database and in the event store. """

	db = None
	dataDir = None

	@classmethod
	def exists (cls, id):
		d = cls.db.runQuery("SELECT guid FROM experiments WHERE guid = ?", (id,))
		d.addCallback(lambda r: len(r) > 0)

		return d

	@classmethod
	def list (cls, limit = 10):
		def _done (rows):
			return [{
				"guid": str(row[0]),
				"sketch_guid": str(row[1]),
				"user_id": int(row[2]),
				"started_date": int(row[3]),
				"sketch_title": str(row[4])
			} for row in rows]

		return cls.db.runQuery("""
			SELECT e.guid, e.sketch_guid, e.user_id, e.started_date, s.title
			FROM experiments AS e 
			LEFT JOIN sketches AS s ON (s.guid = e.sketch_guid)
			ORDER BY e.started_date DESC
			LIMIT ?
		""", (limit, )).addCallback(_done)

	def __init__ (self, sketch):
		id = str(uuid.uuid4())

		self.id = id
		self.sketch = sketch
		self.logMessages = []

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
		openFiles = { "_events": eventFile, "_sketch": sketchFile }

		with snapFile.create() as fp:
			fp.write("\n".join(map(json.dumps, workspace.toEvents())))

		def onSketchEvent (protocol, topic, data):
			print "Sketch event: %s %s %s" % (protocol, topic, data)
			if protocol == "block" and topic == "state":
				return

			writeEvent(sketchFile, protocol, topic, data)

		def writeEvent (file, protocol, topic, data):
			time = now()

			event = {
				"time": time,
				"relative": time - self.startTime,
				"protocol": protocol,
				"topic": topic,
				"data": data
			}

			file.write(json.dumps(event) + "\n")

		sketch.subscribe(self, onSketchEvent)

		# Subscribe to workspace events
		@workspace.on("block-state")
		def onBlockStateChange (data):
			writeEvent(eventFile, "block", "state", data)

			data['sketch'] = sketch_id
			data['experiment'] = id
			sketch.notifySubscribers("block", "state", data, self)

		@workspace.on("log-message")
		def onLogMessage (data):
			writeEvent(eventFile, "experiment", "log", data)

			data['sketch'] = sketch_id
			data['experiment'] = id
			data['time'] = round(now(), 2)
			self.logMessages.append(data)
			sketch.notifySubscribers("experiment", "log", data, self)

		@workspace.variables.on("variable-changed")
		def onVarChanged (data):
			try:
				logFile = openFiles[data['name']]
			except KeyError:
				fileName = re.sub(r'[^a-z0-9\.]', '_', data['name']) + '.csv'
				logFile = self._experimentDir.child(fileName).create()
				openFiles[data['name']] = logFile

				logFile.write("# {:s} start:{:.2f}\n".format(data['name'], self.startTime))

			logFile.write("{:.2f}, {:s}\n".format(data['time'] - self.startTime, str(data['value'])))

		def flushFiles ():
			for file in openFiles:
				file.flush()
				os.fsync(file.fileno())

		flushFilesLoop = task.LoopingCall(flushFiles)
		flushFilesLoop.start(5 * 60, False).addErrback(log.err)

		try:
			yield workspace.run()
		finally:
			sketch.unsubscribe(self)
			workspace.off("block-state", onBlockStateChange)
			workspace.off("log-message", onLogMessage)
			workspace.variables.off("variable-changed", onVarChanged)

			try:
				flushFilesLoop.stop()
			except:
				log.err()

			for file in openFiles.itervalues():
				file.close()

	def pause (self):
		return self.sketch.workspace.pause()

	def resume (self):
		return self.sketch.workspace.resume()

	def stop (self):
		return self.sketch.workspace.abort()

	#
	# Subscribers
	#

	def variables (self):
		from octopus.machine import Component
		from octopus.data.data import BaseVariable

		variables = {}

		for name, var in self.sketch.workspace.variables.iteritems():
			if isinstance(var, Component):
				variables.update(var.variables)
			elif isinstance(var, BaseVariable):
				variables[name] = var

		return variables
