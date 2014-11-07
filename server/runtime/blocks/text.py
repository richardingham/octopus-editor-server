from ..workspace import Block
from twisted.internet import defer

class text (Block):
	def eval (self):
		return defer.succeed(self.getFieldValue('TEXT'))
