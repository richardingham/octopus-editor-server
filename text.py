
class text (Block):
	def eval (self):
		return defer.succeed(self.getFieldValue('TEXT'))
