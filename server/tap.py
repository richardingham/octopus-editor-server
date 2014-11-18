from twisted.application import internet, service
from twisted.internet import interfaces
from twisted.python import usage
import server

class Options (usage.Options):
	optParameters = [
		['wsport', None, 9000, "Listening port for WAMP websockets"],
		['port', None, 8001, "Listening port for web connections"]
	]

	optFlags = [['ssl', 's']]

def makeService(config):
    return server.makeService(config)
