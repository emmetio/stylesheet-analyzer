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

	it('should keep expressions in collections', () => {
		assert.deepEqual(parse('1 + 2 3'), ['1 + 2', '3']);
		assert.deepEqual(parse('1 + 2 * 3'), '1 + 2 * 3');
		assert.deepEqual(parse('(foo: $bar + 3, baz: 2)'), {foo: '$bar + 3', baz: '2'});
	});

	it('test parse', () => {
		const parse = expr => args(parseList(expr)[0].item(0))
			.reduce((out, arg) => {
				out[arg.name] = arg.value != null ? arg.value.valueOf() : null;
				return out;
			}, {});
		assert.deepEqual(parse('fn($a)'), {$a: null});
	});

	it('should parse arguments', () => {
		const parse = expr => args(parseList(expr)[0].item(0))
			.reduce((out, arg) => {
				out[arg.name] = arg.value != null ? arg.value.valueOf() : null;
				return out;
			}, {});

		assert.deepEqual(parse('fn($a)'), {$a: null});
		assert.deepEqual(parse('fn($a, $b)'), {$a: null, $b: null});
		assert.deepEqual(parse('fn($a, $b: 5)'), {$a: null, $b: '5'});
		assert.deepEqual(parse('fn($a: 1, $b: 2)'), {$a: '1', $b: '2'});
		assert.deepEqual(parse('fn($a: 1)'), {$a: '1'});
		assert.deepEqual(parse('fn($a: $b + 2)'), {$a: '$b + 2'});
	});

	it('should parse rest arguments', () => {
		const parse = expr => args(parseList(expr)[0].item(0));
		let a = parse('fn($a...)');
		assert.equal(a.length, 1);
		assert.equal(a[0].name, '$a');
		assert.equal(a[0].value, null);
		assert.equal(a[0].rest, true);

		a = parse('fn($a: 5, $b...)');
		assert.equal(a.length, 2);
		assert.equal(a[0].name, '$a');
		assert.equal(a[0].value, '5');
		assert.equal(a[0].rest, false);

		assert.equal(a[1].name, '$b');
		assert.equal(a[1].value, null);
		assert.equal(a[1].rest, true);
	});

	it('should parse argument invocation', () => {
		const parse = expr => args(parseList(expr)[0].item(0));
		let a = parse('fn(foo, "bar", 10px)');
		assert.equal(a.length, 3);
		assert.equal(a[0].name, null);
		assert.equal(a[0].value.valueOf(), 'foo');

		assert.equal(a[1].name, null);
		assert.equal(a[1].value.valueOf(), '"bar"');

		assert.equal(a[2].name, null);
		assert.equal(a[2].value.valueOf(), '10px');
	});
});
