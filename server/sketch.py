import uuid
import os
import json
from time import time as now

from twisted.internet import defer, threads
from twisted.python import log
from twisted.python.filepath import FilePath

from util import EventEmitter
from runtime.workspace import Workspace, Aborted, Cancelled
from experiment import Experiment


class Sketch (EventEmitter):
	""" This object is the representation of the persistent sketch, 
	stored in the database and in the event store. """
	
	# We will use a file based event store for now, then migrate to EventStore later.

	db = None
	dataDir = None

	@classmethod
	def createId (cls):
		result = defer.Deferred()
		id = str(uuid.uuid4())
		created_date = now()

		# Check that the UUID is not already used. I am sure this is probably unnecessary by definition...
		#rows = cls.db.runQuery("SELECT guid FROM sketches WHERE guid = ?", (id,))
		#if len(rows) == 0:
		#	break

		# Insert the new sketch into the DB
		def _done (result):
			return id

		cls.db.runOperation("""
				INSERT INTO sketches 
				(guid, title, user_id, created_date, modified_date) 
				VALUES (?, ?, ?, ?, ?)
			""", 
			(id, "New Sketch", 1, created_date, created_date)
		).addCallbacks(_done, result.errback)

		return result

	@classmethod
	def exists (cls, id):
		d = cls.db.runQuery("SELECT guid FROM sketches WHERE guid = ?", (id,))
		d.addCallback(lambda r: len(r) > 0)

		return d

	@classmethod
	def list (cls):
		def _done (rows):
			return [{
				"guid": str(row[0]),
				"title": str(row[1]),
				"user_id": int(row[2]),
				"modified_date": int(row[3]),
				"created_date": int(row[4])
			} for row in rows]

		return cls.db.runQuery("""
			SELECT guid, title, user_id, modified_date, created_date 
			FROM sketches 
			ORDER BY modified_date
		""").addCallback(_done)

	def __init__ (self, id):
		self.id = id
		self.title = ""
		self.loaded = False
		self.workspace = Workspace()
		self.experiment = None
		self.subscribers = {}
		self._eventIndex = 0

		self._sketchDir = FilePath(self.dataDir).child(id)
		if not self._sketchDir.exists():
			self._sketchDir.createDirectory()

		eventFile = self._sketchDir.child("events.log")
		if not eventFile.exists():
			eventFile.create()

		self._eventsLog = eventFile.open('a')

	@defer.inlineCallbacks
	def load (self):
		sketch = yield self.db.runQuery(
			"SELECT title FROM sketches WHERE guid = ?", 
			(self.id, )
		)

		if len(sketch) == 0:
			raise Error("Sketch %s not found." % self.id)

		self.title = sketch[0][0]
		self.loaded = True

		# Find the most recent snapshot file
		try:
			max_snap = max(map(
				lambda fp: int(
					os.path.splitext(fp.basename())[0].split('.')[1]
				),
				self._sketchDir.globChildren('snapshot.*.log')
			))

			log.msg(
				"Found snapshot {:d} for sketch {:s}".format(
					max_snap, 
					self.id
				)
			)

		except ValueError:
			self._eventIndex = 0
			self._snapEventIndex = 0
		else:
			self._eventIndex = max_snap
			self._snapEventIndex = max_snap
			snapFile = self._sketchDir.child('snapshot.' + str(max_snap) + '.log')

			if max_snap > 0:
				snapshot = yield threads.deferToThread(snapFile.getContent)
				self.workspace.fromEvents(map(
					json.loads, 
					filter(lambda e: e.strip() != "", snapshot.split("\n"))
				))

	def close (self):
		log.msg("Closing sketch {:s}".format(self.id))

		# If anything has changed...
		if self._eventIndex > self._snapEventIndex:
			# Write a snapshot
			snapFile = self._sketchDir.child("snapshot." + str(self._eventIndex) + ".log")
			if not snapFile.exists():
				snapFile.create()

			with snapFile.open('w') as fp:
				fp.write("\n".join(map(json.dumps, self.workspace.toEvents())))

		# Close the events log
		self._eventsLog.close()

		self.emit("closed")

	#
	# Subscribers
	#
	
	def subscribe (self, subscriber, notifyFn):
		self.subscribers[subscriber] = notifyFn

	def unsubscribe (self, subscriber):
		if subscriber in self.subscribers:
			del self.subscribers[subscriber]

		if len(self.subscribers) is 0:
			self.close()

	def notifySubscribers (self, event, payload, source = None):
		for subscriber, notifyFn in self.subscribers.iteritems():
			if subscriber is not source:
				notifyFn(event, payload)

		#self.emit(event, **payload)

	#
	# Experiment
	#

	def runExperiment (self, context):
		if self.experiment is not None:
			raise ExperimentAlreadyRunning

		self.experiment = Experiment(self)

		self.notifySubscribers("experiment-started", { 
			"sketch": self.id,
			"experiment": self.experiment.id
		}, self.experiment)

		def _done (result):
			self.notifySubscribers("experiment-stopped", { 
				"sketch": self.id,
				"experiment": self.experiment.id
			}, self.experiment)

			self.experiment = None

		def _cancelled (failure):
			f = failure.trap(Aborted, Cancelled)

			if f is not Aborted:
				_done(failure)
			else:
				_error("Stopped by user")

		def _error (failure):
			self.notifySubscribers("experiment-error", { 
				"sketch": self.id,
				"experiment": self.experiment.id,
				"error": str(failure)
			}, self.experiment)

			self.experiment = None

		d = self.experiment.run()
		d.addCallbacks(_done, _cancelled)
		d.addErrback(_error)

	def pauseExperiment (self, context):
		if self.experiment is None:
			raise NoExperimentRunning

		def _notify (result):
			self.notifySubscribers("experiment-paused", { 
				"sketch": self.id,
				"experiment": self.experiment.id
			}, self.experiment)

		def _error (failure):
			self.notifySubscribers("experiment-error", { 
				"sketch": self.id,
				"experiment": self.experiment.id,
				"error": str(failure)
			}, self.experiment)

		self.experiment.pause().addCallbacks(_notify, _error)

	def resumeExperiment (self, context):
		if self.experiment is None:
			raise NoExperimentRunning

		def _notify (result):
			self.notifySubscribers("experiment-resumed", { 
				"sketch": self.id,
				"experiment": self.experiment.id
			}, self.experiment)

		def _error (failure):
			self.notifySubscribers("experiment-error", { 
				"sketch": self.id,
				"experiment": self.experiment.id,
				"error": str(failure)
			}, self.experiment)

		self.experiment.resume().addCallbacks(_notify, _error)

	def stopExperiment (self, context):
		if self.experiment is None:
			raise NoExperimentRunning

		self.experiment.stop()

	#
	# Operations
	#

	def renameSketch (self, payload, context):
		newName = payload['title']

		self._writeEvent("RenameSketch", { "from": self.title, "to": newName })
		self.db.runOperation("UPDATE sketches SET title = ? WHERE guid = ?", (newName, self.id))
		self.title = newName

		self.notifySubscribers("sketch-renamed", { "title": newName }, context)

	def addBlock (self, payload, context):
		eid = self._writeEvent("AddBlock", payload)
		self.workspace.addBlock(payload["block"], payload)

		payload['event'] = eid
		self.notifySubscribers("block-added", payload, context)

	def removeBlock (self, payload, context):
		eid = self._writeEvent("RemoveBlock", payload)
		self.workspace.removeBlock(payload["block"])

		payload['event'] = eid
		self.notifySubscribers("block-removed", payload, context)

	def changeBlock (self, payload, context):
		eid = self._writeEvent("ChangeBlock", payload)
		self.workspace.changeBlock(payload['block'], payload['change'], payload)

		payload['event'] = eid
		self.notifySubscribers("block-changed", payload, context)

	def connectBlock (self, payload, context):
		eid = self._writeEvent("ConnectBlock", payload)
		self.workspace.connectBlock(payload["block"], payload)

		payload['event'] = eid
		self.notifySubscribers("block-connected", payload, context)

	def disconnectBlock (self, payload, context):
		eid = self._writeEvent("DisconnectBlock", payload)
		self.workspace.disconnectBlock(payload["block"], payload)

		payload['event'] = eid
		self.notifySubscribers("block-disconnected", payload, context)

	def _writeEvent (self, eventType, data):
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


class Error (Exception):
	pass

class ExperimentAlreadyRunning (Error):
	pass

class NoExperimentRunning (Error):
	pass
