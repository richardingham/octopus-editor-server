# Package Imports
from ..workspace import Block, Disconnected, Cancelled
from machines import machine_declaration

# Twisted Imports
from twisted.internet import reactor, defer, task

# Octopus Imports
from octopus import data
from octopus.data.errors import Immutable
from octopus.data.data import BaseVariable
from octopus.constants import State
from octopus.machine import Machine, ui
import octopus.transport.basic

# Python Imports
import StringIO
import urllib
from time import time as now

class Image (BaseVariable):

	@property
	def value (self):
		return self._image_fn()

	def get_value (self):
		return self._image_fn()

	@property
	def type (self):
		return Image

	def serialize (self):
		if self.alias is None:
			return "[Image]"
		else:
			return str(self.alias)

	def __init__ (self, title, fn):
		self.alias = None
		self.title = title
		self._image_fn = fn

	def set (self, value):
		raise Immutable

	def setLogFile (self, logFile):
		pass

	def stopLogging (self):
		pass

	def __str__ (self):
		output = StringIO.StringIO()
		img = self._image_fn()
		img.scale(0.25).getPIL().save(output, format = "PNG")
		encoded = "data:image/png;base64," + urllib.quote(output.getvalue().encode('base64'))

		return encoded

	def __repr__ (self):
		return "<%s at %s>" % (
			self.__class__.__name__, 
			hex(id(self))
		)


class DerivedImage (BaseVariable):

	@property
	def value (self):
		return self._value

	def get_value (self):
		return self._value

	@property
	def type (self):
		return Image

	def serialize (self):
		if self.alias is None:
			return "[Image]"
		else:
			return str(self.alias)

	def __init__ (self):
		self.alias = None
		self._value = None

	def set (self, value):
		self._value = value
		self.emit("changed", value = None, time = now())

	def __str__ (self):
		output = StringIO.StringIO()
		img = self._value
		img.scale(0.25).getPIL().save(output, format = "PNG")
		encoded = "data:image/png;base64," + urllib.quote(output.getvalue().encode('base64'))

		return encoded

	def __repr__ (self):
		return "<%s at %s>" % (
			self.__class__.__name__, 
			hex(id(self))
		)


class ImageProvider (Machine):
	protocolFactory = None
	name = "Provide an image from a webcam"
	update_frequency = 1

	def setup (self):
		# setup variables
		self.image = Image(title = "Tracked", fn = self._getImage)

		self.ui = ui(
			properties = [self.image]
		)

	def _getImage (self):
		return self.protocol.image()

	def start (self):
		from time import time as now

		def monitor ():
			self.image.emit("change", time = now(), value = None)

		self._tick(monitor, self.update_frequency)

	def stop (self):
		self._stopTicks()

	def disconnect (self):
		self.stop()

		try:
			self.protocol.disconnect()
		except AttributeError:
			pass


class image_findcolour (Block):
	_map = {
		"RED": lambda r, g, b: r - g,
		"GREEN": lambda r, g, b: g - r,
		"BLUE": lambda r, g, b: b - r,
	}

	def eval (self):
		def calculate (result):
			if result is None:
				return None

			op = self._map[self.fields['OP']]
			return op(*result.splitChannels())

			# Emit a warning if bad op given

		self._complete = self.getInputValue('INPUT').addCallback(calculate)
		return self._complete


class image_threshold (Block):
	def eval (self):
		def calculate (result):
			if result is None:
				return None

			return result.threshold(int(self.fields['THRESHOLD']))

			# Emit a warning if bad op given

		self._complete = self.getInputValue('INPUT').addCallback(calculate)
		return self._complete


class image_erode (Block):
	def eval (self):
		def calculate (result):
			if result is None:
				return None

			return result.erode()

			# Emit a warning if bad op given

		self._complete = self.getInputValue('INPUT').addCallback(calculate)
		return self._complete


class image_tonumber (Block):
	_map = {
		"CENTROIDX": lambda blob: blob.centroid()[0],
		"CENTROIDY": lambda blob: blob.centroid()[1],
		"SIZEX": lambda blob: blob.minRectWidth(),
		"SIZEY": lambda blob: blob.minRectHeight(),
	}

	def eval (self):
		def calculate (result):
			if result is None:
				return None

			blobs = result.findBlobs(100) # min_size

			if blobs is not None:
				blob = blobs.sortArea()[-1]

			else:
				return None

			op = self._map[self.fields['OP']]
			return op(blob)

			# Emit a warning if bad op given

		self._complete = self.getInputValue('INPUT').addCallback(calculate)
		return self._complete


class machine_imageprovider (machine_declaration):
	def getMachineClass (self):
		return ImageProvider


class machine_singletracker (machine_declaration):
	def getMachineClass (self):
		from octopus.image import tracker
		return tracker.SingleBlobTracker


class machine_multitracker (machine_declaration):
	def getMachineClass (self):
		from octopus.image import tracker
		return tracker.MultiBlobTracker

	def getMachineParams (self):
		import json
		try:
			return {
				"count": json.loads(self.mutation)['count']
			}
		except (ValueError, KeyError):
			return {}


class connection_cvcamera (Block):
	def eval (self):
		from octopus.image.source import cv_webcam
		return cv_webcam(int(self.fields['ID']))

