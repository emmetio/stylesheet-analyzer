'use strict';
const assert = require('assert');
require('babel-register');
const { list, map } = require('../lib/scss/collection');

describe('SCSS Collections', () => {
	function json(item) {
		if (Array.isArray(item)) {
			return item.map(json);
		}

		if (item instanceof Map) {
			return Array.from(item.keys()).reduce((out, key) => {
				out[key] = json(item.get(key));
				return out;
			}, {})
		}

		return item != null ? item.valueOf() : item;
	}

	it('should parse list', () => {
		const parse = expr => json(list(expr));

		assert.deepEqual(parse('1 2 3'), ['1', '2', '3']);
		assert.deepEqual(parse('1, 2, 3'), ['1', '2', '3']);
		assert.deepEqual(parse('1 2, 3 4'), [['1', '2'], ['3', '4']]);
		assert.deepEqual(parse('1, 2 3, 4'), ['1', ['2', '3'], '4']);
		assert.deepEqual(parse('(1 2) (3 4)'), [['1', '2'], ['3', '4']]);
	});

	it('should parse map', () => {
		const parse = expr => json(map(expr));

		assert.deepEqual(parse('(foo: bar)'), {foo: 'bar'});
		assert.deepEqual(parse('(foo: bar, baz: 2)'), {foo: 'bar', baz: '2'});

		// Not a map
		assert.equal(parse('(foo, bar)'), null);
		assert.equal(parse('(foo: bar, baz)'), null);
		assert.equal(parse('(foo, baz: bar)'), null);
	});

	it('should parse combined collections', () => {
		const parse = expr => json(map(expr) || list(expr));
		assert.deepEqual(parse('foo, (bar: 1)'), ['foo', { bar: '1' }]);
		assert.deepEqual(parse('foo, (bar: (1 2))'), ['foo', { bar: ['1', '2'] }]);
	});
});
