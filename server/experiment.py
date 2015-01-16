# Python Imports
import uuid
import os
import json
import time
import re
import numpy as np

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
		varsFile = self._experimentDir.child("variables")
		openFiles = { "_events": eventFile, "_sketch": sketchFile }
		usedFiles = {}

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

		# Files are only created when a variable actually gets data,
		# not necessarily when it is created.
		@workspace.variables.on("variable-changed")
		def onVarChanged (data):
			try:
				logFile = openFiles[data['name']]
			except KeyError:
				varName = unusedVarName(data['name'])
				fileName = fileNameFor(varName)
				logFile = self._experimentDir.child(fileName).create()
				openFiles[varName] = logFile
				addUsedFile(varName, fileName, workspace.variables.get(data['name']))

				logFile.write(
					"# name:{:s}\n# type:{:s} \n# start:{:.2f}\n".format(
						data['name'], 
						type(data['value']).__name__, 
						self.startTime
				))

			logFile.write("{:.2f}, {:s}\n".format(data['time'] - self.startTime, str(data['value'])))

		@workspace.variables.on("variable-renamed")
		def onVarRenamed (data):
			openFiles[data['newName']] = openFiles[data['oldName']]
			del openFiles[data['oldName']]
			addUsedFile(data['newName'], "", data['variable'])

		def unusedVarName (varName):
			if varName in usedFiles:
				return unusedVarName(varName + "_")
			return varName

		def fileNameFor (varName):
			return re.sub(r'[^a-z0-9\.]', '_', varName) + '.csv'

		def addUsedFile (varName, fileName, variable):
			try:
				unit = str(variable.unit)
			except AttributeError:
				unit = ""

			if fileName != "":
				usedFiles[varName] = {
					"name": varName,
					"type": variable.type.__name__,
					"unit": unit,
					"file": fileName
				}
			else:
				usedFiles[varName] = {}

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
			workspace.variables.off("variable-renamed", onVarRenamed)

			with varsFile.create() as fp:
				fp.write(json.dumps(usedFiles))

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


class CompletedExperiment (object):
	def __init__ (self, id):
		self.id = id

	@defer.inlineCallbacks
	def load (self):
		expt = yield self._fetchFromDb(self.id)
		experimentDir = self._getExperimentDir(self.id, expt['started_date'])

		self.title = expt['sketch_title']
		self.date = expt['started_date']
		self.sketch_id = expt['sketch_guid']

		variables = yield self._getVariables(experimentDir)
		self.variables = [
			{
				"key": v["name"], 
				"name": '.'.join(v["name"].split('::')[1:]), 
				"type": v["type"],
				"unit": v["unit"]
			}
			for v in variables.itervalues()
			if "name" in v
		]

	@defer.inlineCallbacks
	def loadData (self, variables, start, interval, step):
		date = yield self._fetchDateFromDb(self.id)
		experimentDir = self._getExperimentDir(self.id, date)
		storedVariablesData = yield self._getVariables(experimentDir)

		data = yield defer.gatherResults(map(
			lambda variable: self._getData(
				experimentDir.child(variable["file"]), 
				variable["name"], 
				variable["type"], 
				start, 
				interval
			), 
			map(lambda name: storedVariablesData[name], variables)
		))

		defer.returnValue(data)

	def _fetchFromDb (self, id):
		def _done (rows):
			try:
				row = rows[0]
			except KeyError:
				return None

			return {
				'guid': str(row[0]),
				'sketch_guid': str(row[1]),
				'user_id': int(row[2]),
				'started_date': int(row[3]),
				'sketch_title': str(row[4])
			}

		return Experiment.db.runQuery("""
			SELECT e.guid, e.sketch_guid, e.user_id, e.started_date, s.title
			FROM experiments AS e 
			LEFT JOIN sketches AS s ON (s.guid = e.sketch_guid)
			WHERE e.guid = ?
		""", (id, )).addCallback(_done)

	def _fetchDateFromDb (self, id):
		def _done (rows):
			try:
				return int(rows[0][0])
			except KeyError:
				return None

		return Experiment.db.runQuery("""
			SELECT started_date
			FROM experiments
			WHERE guid = ?
		""", (id, )).addCallback(_done)

	def _getExperimentDir (self, id, startTime):
		stime = time.gmtime(startTime)

		experimentDir = FilePath(Experiment.dataDir)
		for segment in [stime.tm_year, stime.tm_mon, stime.tm_mday, id]:
			experimentDir = experimentDir.child(str(segment))
			if not experimentDir.exists():
				return None

		return experimentDir

	@defer.inlineCallbacks
	def _getVariables (self, experimentDir):
		varsFile = experimentDir.child("variables")
		try:
			content = yield threads.deferToThread(varsFile.getContent)
			variables = json.loads(content)
		except:
			log.err()
			variables = {}

		defer.returnValue(variables)

	@defer.inlineCallbacks
	def _getData (self, dataFile, name, var_type, start = None, interval = None):
		if var_type == "int":
			dtype = int
		elif var_type == "float":
			dtype = float
		else:
			dtype = str

		try:
			fp = dataFile.open()
			data_a = yield threads.deferToThread(np.loadtxt, fp, dtype = dtype, delimiter = ',')
		except:
			log.err()
			defer.returnValue({})
		finally:
			fp.close()

		# Make a readable variable name
		var_name = '.'.join(name.split('::')[1:])

		# Select a certain portion of the data
		if start is not None and interval is not None:
			data_a = data_a[np.where((start <= data_a[:,0]) * (data_a[:, 0] <= start + interval))]
		else:
			interval = data_a[-1][0] - data_a[0][0]

		data = data_a.tolist()
		if len(data) > 200 and var_type in ("int", "float"):
			spread = np.ptp(data_a[:,1])
			print "Simplifying data with interval " + str(interval) + " (currently %s points)" % len(data)
			print "Spread: %s" % spread
			print "Epsilon: %s" % min(interval / 25., spread / 5.)
			data = rdp(data, epsilon = min(interval / 25., spread / 5.))
			print " -> %s points" % len(data)

		defer.returnValue({
			'name': var_name,
			'type': var_type,
			'data': data
		})

		
from math import sqrt

def distance(a, b):
    return  sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)

def point_line_distance(point, start, end):
    if (start == end):
        return distance(point, start)
    else:
        n = abs(
            (end[0] - start[0]) * (start[1] - point[1]) - (start[0] - point[0]) * (end[1] - start[1])
        )
        d = sqrt(
            (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2
        )
        return n / d

def rdp(points, epsilon):
    """
    Reduces a series of points to a simplified version that loses detail, but
    maintains the general shape of the series.
    """
    dmax = 0.0
    index = 0
    for i in range(1, len(points) - 1):
        d = point_line_distance(points[i], points[0], points[-1])
        if d > dmax:
            index = i
            dmax = d
    if dmax >= epsilon:
        results = rdp(points[:index+1], epsilon)[:-1] + rdp(points[index:], epsilon)
    else:
        results = [points[0], points[-1]]
    return results
