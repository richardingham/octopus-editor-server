import uuid
import os
import json
from datetime import datetime as now

from twisted.internet import defer, threads
from twisted.python.filepath import FilePath

from util import EventEmitter
from runtime.workspace import Workspace

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

		return cls.db.runQuery("SELECT guid, title, user_id, modified_date, created_date FROM sketches ORDER BY modified_date").addCallback(_done)

	def __init__ (self, id):
		self.id = id
		self.title = ""
		self.loaded = False
		self.workspace = Workspace()
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
		sketch = yield self.db.runQuery("SELECT title FROM sketches WHERE guid = ?", (self.id,))

		if len(sketch) == 0:
			raise Error("Sketch %s not found." % self.id)

		self.title = sketch[0][0]
		self.loaded = True

		# Find the most recent snapshot file
		try:
			print "glob: " + str(self._sketchDir.globChildren('snapshot.*.log'))
			max_snap = max(map(
				lambda fp: int(os.path.splitext(fp.basename())[0].split('.')[1]),
				self._sketchDir.globChildren('snapshot.*.log')
			))
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
		# If anything has changed...
		if self._eventIndex > self._snapEventIndex:
			# Write a snapshot
			snapFile = self._sketchDir.child("snapshot." + str(self._eventIndex) + ".log")
			if not snapFile.exists():
				snapFile.create()

			fp = snapFile.open('w')
			fp.write("\n".join(map(json.dumps, self.workspace.toEvents())))
			fp.close()

		# Close the events log
		self._eventsLog.close()

	def renameSketch (self, newName):
		self._writeEvent("RenameSketch", { "from": self.title, "to": newName })
		self.db.runOperation("UPDATE sketches SET title = ? WHERE guid = ?", (newName, self.id))
		self.title = newName

		self.emit("sketch-renamed", title = newName)

	def addBlock (self, payload):
		eid = self._writeEvent("AddBlock", payload)
		self.workspace.addBlock(payload["block"], payload)

		payload['event'] = eid
		self.emit("block-added", **payload)

	def removeBlock (self, payload):
		eid = self._writeEvent("RemoveBlock", payload)
		self.workspace.removeBlock(payload["block"])

		payload['event'] = eid
		self.emit("block-removed", **payload)

	def changeBlock (self, payload):
		eid = self._writeEvent("ChangeBlock", payload)
		self.workspace.changeBlock(payload['block'], payload['change'], payload)

		payload['event'] = eid
		self.emit("block-changed", **payload)

	def connectBlock (self, payload):
		eid = self._writeEvent("ConnectBlock", payload)
		self.workspace.connectBlock(payload["block"], payload)

		payload['event'] = eid
		self.emit("block-connected", **payload)

	def disconnectBlock (self, payload):
		eid = self._writeEvent("DisconnectBlock", payload)
		self.workspace.disconnectBlock(payload["block"], payload)

		payload['event'] = eid
		self.emit("block-disconnected", **payload)

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
