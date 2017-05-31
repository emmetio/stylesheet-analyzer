'use strict';

const assert = require('assert');
require('babel-register');
const SCSS = require('../lib/scss').default;

describe('SCSS Stylesheet', () => {
	it('should extract SCSS dependencies', () => {
		let style = new SCSS('@import "foo";');
		assert.deepEqual(style.dependencies, ['foo']);

		style = new SCSS('@import "foo", "bar", \'baz\';');
		assert.deepEqual(style.dependencies, ['foo', 'bar', 'baz']);

		style = new SCSS('@import "foo";@import "bar";@import \'baz\';');
		assert.deepEqual(style.dependencies, ['foo', 'bar', 'baz']);
	});

	it('should skip CSS dependencies', () => {
		let style = new SCSS('@import "foo" screen;');
		assert.deepEqual(style.dependencies, []);

		style = new SCSS('@import url("foo");');
		assert.deepEqual(style.dependencies, []);

		style = new SCSS('@import "foo.css";');
		assert.deepEqual(style.dependencies, []);

		style = new SCSS('@import "http://foo.com/bar";');
		assert.deepEqual(style.dependencies, []);
	});
});
