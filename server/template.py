from twisted.web.template import Element, renderer, XMLFile
from twisted.python.filepath import FilePath

import os
import json
import time, datetime

templatesDir = FilePath(os.path.join(os.path.basename(__file__), "..", "templates"))

websocketUrl = "ws://localhost:9000"

class Root (Element):
	loader = XMLFile(templatesDir.child('root.xml'))

	def __init__ (self, running_experiments, past_experiments, saved_sketches):
		Element.__init__(self)
		self.running_experiments = running_experiments
		self.past_experiments = past_experiments
		self.saved_sketches = saved_sketches

	@renderer
	def running_experiment (self, request, tag):
		for expt in self.running_experiments:
			yield tag.clone().fillSlots(
				url = "/experiment/{:s}".format(expt.id),
				title = expt.sketch.title,
				duration = str(datetime.timedelta(seconds = int(
					time.time() - expt.startTime
				)))
			)

	@renderer
	def past_experiment (self, request, tag):
		def _done (expts):
			def _render ():
				for expt in expts:
					yield tag.clone().fillSlots(
						url = "/experiment/{:s}".format(expt['guid']),
						delete_url = "/experiment/{:s}/delete".format(expt['guid']),
						download_url = "/experiment/{:s}/download".format(expt['guid']),
						title = expt['title'],
						finished_date = time.strftime(
							'%d %b %Y, %H:%M:%S',
							time.gmtime(expt['finished_date'])
						),
						duration = str(datetime.timedelta(seconds = int(
							expt['finished_date'] - expt['started_date']
						)))
					)

			return _render()

		return self.past_experiments.addCallback(_done)

	@renderer
	def saved_sketch (self, request, tag):
		def _done (sketches):
			def _render ():
				for sketch in sketches:
					yield tag.clone().fillSlots(
						url = "/sketch/{:s}".format(sketch['guid']),
						delete_url = "/sketch/{:s}/delete".format(sketch['guid']),
						copy_url = "/sketch/{:s}/copy".format(sketch['guid']),
						title = sketch['title'],
						modified_date = time.strftime(
							'%d %b %Y, %H:%M:%S',
							time.gmtime(sketch['modified_date'])
						)
					)

			return _render()

		return self.saved_sketches.addCallback(_done)


class SketchEdit (Element):
	loader = XMLFile(templatesDir.child('sketch-edit.xml'))

	def __init__ (self, sketch_id):
		Element.__init__(self)
		self.sketch_id = sketch_id

	@renderer
	def editor_body (self, request, tag):
		return tag.fillSlots(
			websocket_url = websocketUrl,
			sketch_id = self.sketch_id
		)


class ExperimentResult (Element):
	loader = XMLFile(templatesDir.child('experiment-result.xml'))

	def __init__ (self, expt):
		Element.__init__(self)
		self.expt = expt
		self._load = expt.load()

	@renderer
	def body (self, request, tag):
		def _done (result):
			return tag.fillSlots(
				sketch_url = "/sketch/{:s}".format(self.expt.sketch_id),
				data_url = "/experiment/{:s}/data".format(self.expt.id),
				id = self.expt.id,
				title = self.expt.title,
				sketch_id = self.expt.sketch_id,
				date = str(self.expt.date),
				variables = json.dumps(self.expt.variables)
			)

		return self._load.addCallback(_done)


class ExperimentDownload (Element):
	loader = XMLFile(templatesDir.child('experiment-download.xml'))

	def __init__ (self, expt):
		Element.__init__(self)
		self.expt = expt
		self._load = expt.load()

	@renderer
	def variable (self, request, tag):
		def _done (_):
			def _render ():
				for v in self.expt.variables:
					yield tag.clone().fillSlots(
						key = v['key'],
						name = v['name'],
						type = v['type'],
						unit = v['unit'],
					)

			return _render()

		return self._load.addCallback(_done)


class ExperimentRunning (Element):
	loader = XMLFile(templatesDir.child('experiment-running.xml'))

	def __init__ (self, experiment):
		Element.__init__(self)
		self.experiment = experiment

	@renderer
	def editor_body (self, request, tag):
		return tag.fillSlots(
			websocket_url = websocketUrl,
			sketch_id = self.experiment.sketch.id,
			experiment_id = self.experiment.id
		)
