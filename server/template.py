from twisted.web.template import Element, renderer, XMLFile
from twisted.python.filepath import FilePath

import os

templatesDir = FilePath(os.path.join(os.path.basename(__file__), "..", "templates"))


class Root (Element):
	loader = XMLFile(templatesDir.child('root.xml'))

	def __init__ (self, running_experiments, past_experiments, saved_sketches):
		Element.__init__(self)
		self.running_experiments = running_experiments
		self.past_experiments = past_experiments
		self.saved_sketches = saved_sketches

	@renderer
	def past_experiment (self, request, tag):
		return tag

	@renderer
	def saved_sketch (self, request, tag):
		def _done (sketches):
			def _render ():
				for sketch in sketches:
					yield tag.clone().fillSlots(
						url = "/sketch/{:s}".format(sketch['guid']),
						title = sketch['title']
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
			sketch_id = self.sketch_id
		)


