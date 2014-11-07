from ..workspace import Block
from twisted.internet import defer

import operator


class logic_null (Block):
	def eval (self):
		return defer.succeed(None)


class logic_boolean (Block):
	def eval (self):
		return defer.succeed(self.fields['BOOL'] == 'TRUE')


class logic_negate (Block):
	def eval (self):
		def negate (result):
			return result == False

		self._complete = self.getInputValue('BOOL').addCallback(negate)
		return self._complete


class logic_compare (Block):
	_map = {
		"EQ": operator.eq,
		"NEQ": operator.ne,
		"LT": operator.lt,
		"LTE": operator.le,
		"GT": operator.gt,
		"GTE": operator.ge
	}

	def eval (self):
		def compare (results):
			lhs, rhs = results

			op = self._map[self.fields['OP']]
			return op(lhs, rhs)

			# Emit a warning if bad op given

		lhs = self.getInputValue('A')
		rhs = self.getInputValue('B')

		self._complete = defer.gatherResults([lhs, rhs]).addCallback(compare)
		return self._complete


class logic_operation (Block):
	def eval (self):
		@defer.inlineCallbacks
		def _run ():
			op = self.fields['OP']
			lhs = yield self.getInputValue('A')

			if op == "AND":
				if bool(lhs):
					rhs = yield self.getInputValue('B')
					defer.returnValue(bool(rhs))
				else:
					defer.returnValue(False)
			elif op == "OR":
				if bool(lhs):
					defer.returnValue(True)
				else:
					rhs = yield self.getInputValue('B')
					defer.returnValue(bool(rhs))

			# Emit a warning
			defer.returnValue(None)

		self._complete = _run()
		return self._complete


class logic_ternary (Block):
	def eval (self):
		@defer.inlineCallbacks
		def _run ():
			test = yield self.getInputValue('IF')

			if bool(test):
				result = yield self.getInputValue('THEN')
				defer.returnValue(result)
			else:
				result = yield self.getInputValue('ELSE')
				defer.returnValue(result)

		self._complete = _run()
		return self._complete
