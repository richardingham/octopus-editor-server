from ..workspace import Block
from twisted.internet import defer

import math, operator, random

class math_number (Block):
	def eval (self):
		number = float(self.fields['NUM'])
		if number % 1 == 0:
			number = int(number)

		return defer.succeed(number)


class math_constant (Block):
	_map = {
		"PI": math.pi,
		"E": math.e,
		"GOLDEN_RATIO": (1 + math.sqrt(5)) / 2,
		"SQRT2": math.sqrt(2),
		"SQRT1_2": math.sqrt(0.5),
		"INFINITY": float('inf')
	}

	def eval (self):
		return defer.succeed(self._map(self.fields['CONSTANT']))

		# Emit a warning if bad op given


class math_single (Block):
	_map = {
		"ROOT": math.sqrt,
		"ABS": math.fabs,
		"NEG": lambda x: -x,
		"LN": math.log,
		"LOG10": math.log10,
		"EXP": math.exp,
		"POW10": lambda x: math.pow(10, x)
	}

	def eval (self):
		def calculate (result):
			op = self._map[self.fields['OP']]
			return op(result)

			# Emit a warning if bad op given

		self._complete = self.getInputValue('NUM').addCallback(calculate)
		return self._complete


class math_trig (math_single):
	_map = {
		"SIN": lambda x: math.sin(x / 180.0 * math.pi),
		"COS": lambda x: math.cos(x / 180.0 * math.pi),
		"TAN": lambda x: math.tan(x / 180.0 * math.pi),
		"ASIN": lambda x: math.asin(x) / 180.0 * math.pi,
		"ACOS": lambda x: math.acos(x) / 180.0 * math.pi,
		"ATAN": lambda x: math.atan(x) / 180.0 * math.pi
	}


class math_round (math_single):
	_map = {
		"ROUND": round,
		"ROUNDUP": math.ceil,
		"ROUNDDOWN": math.floor
	}


class math_arithmetic (Block):
	_map = {
		"ADD": operator.add,
		"MINUS": operator.sub,
		"MULTIPLY": operator.mul,
		"DIVIDE": operator.div,
		"POWER": math.pow
	}

	def eval (self):
		def calculate (results):
			lhs, rhs = results

			op = self._map[self.fields['OP']]
			return op(lhs, rhs)

			# Emit a warning if bad op given

		lhs = self.getInputValue('A')
		rhs = self.getInputValue('B')

		self._complete = defer.gatherResults([lhs, rhs]).addCallback(calculate)
		return self._complete


class math_number_property (Block):
	_map = {
		"EVEN": lambda x: x % 2 == 0,
		"ODD": lambda x: x % 2 == 1,
		"WHOLE": lambda x: x % 1 == 0,
		"POSITIVE": lambda x: x > 0,
		"NEGATIVE": lambda x: x < 0,
	}

	def eval (self):
		if self.fields['PROPERTY'] == "DIVISIBLE_BY":
			def calculate (results):
				lhs, rhs = results
				
				return float(lhs) % float(rhs) == 0

			lhs = self.getInputValue('NUMBER_TO_CHECK')
			rhs = self.getInputValue('DIVISOR')

			self._complete = defer.gatherResults([lhs, rhs]).addCallback(calculate)

			return self._complete

		def calculate (result):
			op = self._map[self.fields['PROPERTY']]
			return op(float(result))

			# Emit a warning if bad op given

		self._complete = self.getInputValue('NUMBER_TO_CHECK').addCallback(calculate)
		return self._complete


class math_modulo (Block):
	def eval (self):
		def calculate (results):
			a, b = results
			return operator.mod(a, b)

		self._complete = defer.gatherResults([
			self.getInputValue('DIVIDEND'),
			self.getInputValue('DIVISOR')
		]).addCallback(calculate)

		return self._complete


class math_constrain (Block):
	def eval (self):
		def calculate (results):
			val, low, high = results
			return min(max(val, low), high)

		self._complete = defer.gatherResults([
			self.getInputValue('VALUE'),
			self.getInputValue('LOW'),
			self.getInputValue('HIGH')
		]).addCallback(calculate)

		return self._complete


class math_random_int (Block):
	def eval (self):
		def calculate (results):
			low, high = results
			return math.randint(low, high)

		self._complete = defer.gatherResults([
			self.getInputValue('FROM'),
			self.getInputValue('TO')
		]).addCallback(calculate)

		return self._complete


class math_random_float (Block):
	def eval (self):
		return defer.succeed(random.random())
