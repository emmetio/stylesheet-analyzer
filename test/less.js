'use strict';

const assert = require('assert');
require('babel-register');
const LESS = require('../lib/less').default;
const { interpolate, evaluate } = require('../lib/less/expression');

describe('LESS Stylesheet', () => {
	it('should interpolate expressions', () => {
		assert.equal(interpolate('foo @{@foo + 2} bar', { '@foo': 10 }), 'foo 12 bar');
		assert.equal(interpolate('foo "@{@bar}"', { '@bar': 'bar' }), 'foo "bar"');
		assert.equal(interpolate('foo "@{@bar}"', { '@bar': '"bar"' }), 'foo "bar"', 'Unquote string inside quotes');
	});

	it('should evaluate expression', () => {
		assert.equal(evaluate('1 + 2'), 3);
		assert.equal(evaluate('@foo * @bar', { '@foo': 10, '@bar': 20 }), 200);
	});

	it('should resolve basic stylesheet', () => {
		let style;

		style = new LESS('foo { bar { padding: 2 * 10px; } }');
		assert.equal(style.transform().toCSS(true), 'foo bar {\n\tpadding: 20px;\n}\n');

		style = new LESS('foo { bar & { padding: 2 * 10px; bg: url(/logo.gif); } }');
		assert.equal(style.transform().toCSS(true), 'bar foo {\n\tpadding: 20px;\n\tbg: url(/logo.gif);\n}\n');
	});

	it('should interpolate rule', () => {
		const style = new LESS('@foo: bar; .test@{@foo} { padding: 0 }');
		assert.equal(style.transform().toCSS(true), '.testbar {\n\tpadding: 0;\n}\n');
	});

	it('should resolve variables', () => {
		let style;
		
		style = new LESS('@a: 10px; @b: @a * 2; foo { padding: @a + @b; }');
		assert.equal(style.transform().toCSS(true), 'foo {\n\tpadding: 30px;\n}\n');

		// Test scope
		style = new LESS('@a: 10px; foo { @a: 20px; padding: @a; } bar { padding: @a; }');
		assert.equal(style.transform().toCSS(true), 'foo {\n\tpadding: 20px;\n}\nbar {\n\tpadding: 10px;\n}\n');
	});
});
