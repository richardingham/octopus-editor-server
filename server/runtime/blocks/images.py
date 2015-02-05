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
import octopus.transport.basic

# Python Imports
from time import time as now


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

		self._complete = self.getInputValue('INPUT').addCallback(calculate)
		return self._complete


class image_erode (Block):
	def eval (self):
		def calculate (result):
			if result is None:
				return None

			return result.erode()

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
		from octopus.image.provider import ImageProvider
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
