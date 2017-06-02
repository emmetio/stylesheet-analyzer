'use strict';

const assert = require('assert');
require('babel-register');
const SCSS = require('../lib/scss').default;
const { interpolate, evaluate } = require('../lib/scss/expression');

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

	it('should interpolate expressions', () => {
		assert.equal(interpolate('foo #{$foo + 2} bar', { $foo: 10 }), 'foo 12 bar');
		assert.equal(interpolate('foo "#{$bar}"', { $bar: 'bar' }), 'foo "bar"');
		assert.equal(interpolate('foo "#{$bar}"', { $bar: '"bar"' }), 'foo "bar"', 'Unquote string inside quotes');
	});

	it('should evaluate expression', () => {
		assert.equal(evaluate('1 + 2'), 3);
		assert.equal(evaluate('$foo * $bar', { $foo: 10, $bar: 20 }), 200);
	});

	it('should resolve basic stylesheet', () => {
		const style = new SCSS('foo { bar { padding: 2 * 10px; } }');
		assert.equal(style.transform().toCSS(true), 'foo bar {\n\tpadding: 20px;\n}\n');
	});
});
