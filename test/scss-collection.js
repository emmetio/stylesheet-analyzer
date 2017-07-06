'use strict';
const assert = require('assert');
const parseList = require('@emmetio/css-parser').parseList;
require('babel-register');
const collection = require('../lib/scss/collection').default;
const args = require('../lib/scss/arguments').default;

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

	function parse(expr) {
		const parsed = parseList(expr).map(token => json(collection(token)));
		return parsed.length === 1 ? parsed[0] : parsed;
	};

	it('should parse collections', () => {
		// Lists
		assert.deepEqual(parse('1 2 3'), ['1', '2', '3']);
		assert.deepEqual(parse('1, 2, 3'), ['1', '2', '3']);
		assert.deepEqual(parse('1 2, 3 4'), [['1', '2'], ['3', '4']]);
		assert.deepEqual(parse('1, 2 3, 4'), ['1', ['2', '3'], '4']);
		assert.deepEqual(parse('(1 2) (3 4)'), [['1', '2'], ['3', '4']]);
		assert.deepEqual(parse('(foo, bar)'), ['foo', 'bar']);

		// Maps
		assert.deepEqual(parse('(foo: bar)'), {foo: 'bar'});
		assert.deepEqual(parse('(foo: bar, baz: 2)'), {foo: 'bar', baz: '2'});

		// Combined
		assert.deepEqual(parse('foo, (bar: 1)'), ['foo', { bar: '1' }]);
		assert.deepEqual(parse('foo, (bar: (1 2))'), ['foo', { bar: ['1', '2'] }]);
	});

	it('should parse arguments', () => {
		const parse = expr => json(args(parseList(expr)[0]));

		assert.deepEqual(parse('($a)'), {$a: null});
		assert.deepEqual(parse('($a, $b)'), {$a: null, $b: null});
		assert.deepEqual(parse('($a, $b: 5)'), {$a: null, $b: 5});
		assert.deepEqual(parse('($a: 1, $b: 2)'), {$a: 1, $b: 2});
		assert.deepEqual(parse('($a: 1)'), {$a: 1});
	});
});
