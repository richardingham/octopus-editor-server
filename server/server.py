# -*- coding: utf-8 -*-

# Twisted Imports
from twisted.application import internet, service
from twisted.enterprise import adbapi
from twisted.internet import reactor, defer, utils
from twisted.spread import pb
from twisted.python import log
from twisted.web import server, static, resource, guard
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
		def _done (result):
			sketches = ["<li>%s : %s</li>" % (item["guid"], item["title"]) for item in result]
			sketches_html = "<ul>" + "\n".join(sketches) + "</ul>"
				
			request.write("""
				<!DOCTYPE html>
				<html>
				<head>
					<title>Octopus</title>
				</head>
				<body>
					<form action=\"/sketch/create\" method=\"post\">
					<button type=\"submit\">New Sketch</button>
					</form>
					""" + sketches_html + """
				</body>
				</html>
			""")

			request.finish()

		def _error (failure):
			request.write("There was an error: " + str(failure))
			request.finish()

		sketch.Sketch.list().addCallback(_done).addErrback(_error)

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
				request.write("Sketch %s not found." % id)
				request.finish()
				return

			request.write("Sketch" + str(sketch))
			request.finish()

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
	#root.putChild("resources", static.File("resources"))
	site = server.Site(root)
	reactor.listenTCP(8001, site)
	log.msg("HTTP listening on port 8001")

	reactor.run()

	log.msg("Server stopped")

if __name__ == "__main__":
	run_server()
