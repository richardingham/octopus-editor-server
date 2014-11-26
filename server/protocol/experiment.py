from time import time as now

class ExperimentProtocol (object):
	def __init__ (self, transport):
		self.transport = transport

	def send (self, topic, payload, context):
		self.transport.send('experiment', topic, payload, context)

	def receive (self, topic, payload, sketch, experiment, context):
		try:
			# Experiment control commands
			if sketch is None:
				raise Error("[%s:%s] No Sketch specified" % ('experiment', topic))

			if topic == 'run':
				return sketch.runExperiment(context)
			if topic == 'pause':
				return sketch.pauseExperiment(context)
			if topic == 'resume':
				return sketch.resumeExperiment(context)
			if topic == 'stop':
				return sketch.stopExperiment(context)

			# Experiment interaction commands
			if experiment is None:
				raise Error("[%s:%s] No Experiment specified" % ('experiment', topic))

			if topic == 'load':
				return self.loadExperiment(experiment, context)
			if topic == 'choose-properties':
				return context.chooseExperimentProperties(experiment, payload['properties'])
			if topic == 'choose-streams':
				return context.chooseExperimentStreams(experiment, payload['streams'])
			if topic == 'get-properties':
				return self.sendProperties(sketch, experiment, context.getExperimentProperties(experiment), context)
			if topic == 'get-streams':
				oneoff = 'oneoff' in payload and payload['oneoff']
		
				if 'streams' in payload:
					streams = payload['streams']
				else:
					streams = context.getExperimentStreams(experiment)
				
				return self.sendStreams(sketch, experiment, streams, payload['start'], context, oneoff)

		except Error as e:
			self.send('error', e, context)
			return

	def loadExperiment (self, experiment, context):
		def _prop (p):
			result = {
				"name":  p.alias,
				"title": p.title if hasattr(p, "title") else "",
				"unit":  p.unit if hasattr(p, "unit") else "",
				"type":  p.type.__name__ if type(p.type) is not str else p.type,
				"value": p.value,
				"edit":  hasattr(p, "_setter")
			}

			for key in ("min", "max", "options", "colour"):
				try:
					attr = getattr(p, key)

					if attr is not None:
						result[key] = attr
				except AttributeError:
					pass

			return result

		context.subscribeExperiment(experiment)

		self.send("load", {
			"sketch": experiment.sketch.id,
			"experiment": experiment.id,
			"title": experiment.sketch.title,
			"variables": [_prop(v) for v in experiment.variables().itervalues()]
		}, context)

	def sendProperties (self, sketch, experiment, properties, context):
		variables = experiment.variables()

		def _value (name):
			try:
				return variables[name].value
			except KeyError:
				return None

		return self.send(
			'properties', 
			{
				"sketch": sketch.id,
				"experiment": experiment.id,
				"data": { 
					name: _value(name) 
					for name in properties 
				}
			},
			context
		)

	def sendStreams (self, sketch, experiment, streams, start, context, oneoff = False):
		variables = experiment.variables()

		interval = now() - start

		def _compress (point):
			try:
				return (round(point[0] - start, 1), round(point[1], 2))
			except TypeError:
				return 0
				
		payload = {
			"sketch": sketch.id,
			"experiment": experiment.id,
			"zero": round(start, 1),
			"max": round(start + interval, 1),
			"data": { 
				name: map(_compress, variables[name].get(start, interval)) 
				for name in streams 
			}
		}

		if oneoff:
			payload['oneoff'] = True

		return self.send(
			'streams', 
			payload,
			context
		)


class Error (Exception):
	pass

