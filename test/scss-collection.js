'use strict';
const assert = require('assert');
require('babel-register');
const { list, SCSSList } = require('../lib/scss/collection');

describe('SCSS Collections', () => {

	it('should parse list', () => {
		const json = item => item instanceof SCSSList
			? item.valueOf().map(json)
			: item.valueOf();
		const parse = expr => json(list(expr));

		assert.deepEqual(parse('1 2 3'), ['1', '2', '3']);
		assert.deepEqual(parse('1, 2, 3'), ['1', '2', '3']);
		assert.deepEqual(parse('1 2, 3 4'), [['1', '2'], ['3', '4']]);
		assert.deepEqual(parse('1, 2 3, 4'), [['1', '2'], ['3', '4']]);
		assert.deepEqual(parse('(1 2) (3 4)'), [['1', '2'], ['3', '4']]);
	});
});
