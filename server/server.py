# -*- coding: utf-8 -*-

# Twisted Imports
from twisted.application import internet, service
from twisted.enterprise import adbapi
from twisted.internet import reactor, defer, utils
from twisted.spread import pb
from twisted.python import log, filepath
from twisted.web import server, static, resource, guard
from twisted.web.template import flatten
from twisted.cred.portal import IRealm, Portal

# Zope Imports
from zope.interface import implements

# Autobahn Imports
from autobahn.twisted.websocket import WebSocketServerProtocol, WebSocketServerFactory
from autobahn.websocket.compress import PerMessageDeflateOffer, PerMessageDeflateOfferAccept

# Sibling Imports
# import template
import sketch
import websocket
import template

# System Imports
import os
import uuid
import sqlite3
from time import time as now

##
## Database
##

data_path = os.path.abspath(os.path.join(os.path.basename(__file__), "..", "data"))

dbfilename = os.path.join(data_path, "octopus.db")
dbpool = adbapi.ConnectionPool("sqlite3", dbfilename, check_same_thread = False)
print "Using database: " + dbfilename

sketch.Sketch.db = dbpool
sketch.Sketch.dataDir = os.path.join(data_path, "sketches")

##
## HTTP Server - Home Page
##

class Root (resource.Resource):
	def render_GET (self, request):
		def _error (failure):
			request.write("There was an error: " + str(failure))
			request.finish()

		saved_sketches = sketch.Sketch.list()
		past_experiments = []
		running_experiments = []
		
		tpl = template.Root(running_experiments, past_experiments, saved_sketches)
		request.write("<!DOCTYPE html>\n")
		d = flatten(request, tpl, request.write)
		d.addCallbacks(lambda _: request.finish())
		d.addErrback(_error)

		return server.NOT_DONE_YET


class Sketch (resource.Resource):

	def getChild (self, id, request):
		if id == "create":
			return NewSketch()

		return EditSketch(id)


class NewSketch (resource.Resource):

	isLeaf = True

	def render_POST (self, request):
		def _redirect (id):
			url = request.URLPath().sibling(id)
			request.redirect(url)
			request.finish()

		def _error (failure):
			request.write("There was an error: " + failure)
			request.finish()

		sketch.Sketch.createId().addCallbacks(_redirect, _error)

		return server.NOT_DONE_YET


class EditSketch (resource.Resource):
	
	def __init__ (self, id):
		resource.Resource.__init__(self)
		self._id = id

	def render_GET (self, request):
		def _done (exists):
			if not exists:
				request.write("Sketch %s not found." % self._id)
				request.finish()
				return

			tpl = template.SketchEdit(self._id)
			request.write("<!DOCTYPE html>\n")
			d = flatten(request, tpl, request.write)
			d.addCallbacks(lambda _: request.finish())

		def _error (failure):
			request.write("There was an error: " + str(failure))
			request.finish()

		print "Fetch for sketch id " + str(self._id)
		d = sketch.Sketch.exists(self._id)
		d.addCallbacks(_done, _error)

		return server.NOT_DONE_YET


def run_server ():
	import sys
	log.startLogging(sys.stdout)

	ws_host = "localhost"
	ws_port = 9000
	factory = WebSocketServerFactory("ws://" + ws_host + ":" + str(ws_port), debug = False)
	factory.protocol = websocket.OctopusEditorProtocol
	factory.runtime = websocket.WebSocketRuntime()

	# Required for Chromium ~33 and newer
	def accept (offers):
		for offer in offers:
			if isinstance(offer, PerMessageDeflateOffer):
				return PerMessageDeflateOfferAccept(offer)

	factory.setProtocolOptions(perMessageCompressionAccept = accept)
	
	reactor.listenTCP(ws_port, factory)
	log.msg("WS listening on port %s" % ws_port)

	root = resource.Resource()
	root.putChild("", Root())
	root.putChild("sketch", Sketch())
	
	rootDir = filepath.FilePath(os.path.join(os.path.basename(__file__), ".."))
	root.putChild("bower_components", static.File(rootDir.child("bower_components").path))
	root.putChild("components", static.File(rootDir.child("components").path))
	root.putChild("resources", static.File(rootDir.child("resources").path))

	site = server.Site(root)
	reactor.listenTCP(8001, site)
	log.msg("HTTP listening on port 8001")

	reactor.run()

	log.msg("Server stopped")

if __name__ == "__main__":
	run_server()
