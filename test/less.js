'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const parser = require('@emmetio/css-parser').default;
require('babel-register');
const LESS = require('../lib/less').default;
const { interpolate, evaluate } = require('../lib/less/expression');
const { getExtend } = require('../lib/less/extend');

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

	it('should apply extends', () => {
		let style;
		
		style = new LESS('foo:extend(.bar) { margin: 5px; } .bar { padding: 10px } ');
		assert.equal(style.transform().toCSS(true), 'foo {\n\tmargin: 5px;\n}\n.bar, foo {\n\tpadding: 10px;\n}\n');

		style = new LESS('.ext3, .ext4 { &:extend(.foo all); &:extend(.bar all); } .foo { a: 1 } .bar { b: 2 }');
		assert.equal(style.transform().toCSS(true), '.foo, .ext3, .ext4 {\n\ta: 1;\n}\n.bar, .ext3, .ext4 {\n\tb: 2;\n}\n');

		style = new LESS('.a.b { a: 1; } .b.a { b: 2; } .c { &:extend(.a all); c: 3; }');
		assert.equal(style.transform().toCSS(true), '.a.b, .c.b {\n\ta: 1;\n}\n.b.a, .b.c {\n\tb: 2;\n}\n.c {\n\tc: 3;\n}\n');

		style = new LESS('.ext8 { .ext9 { result: match-nested-bar; } } .buu:extend(.ext8 .ext9 all) {}');
		assert.equal(style.transform().toCSS(true), '.ext8 .ext9, .buu {\n\tresult: match-nested-bar;\n}\n');

		style = new LESS('.bb .bb { color: black; } .ff:extend(.dd,.bb all) {}');
		assert.equal(style.transform().toCSS(true), '.bb .bb, .ff .ff {\n\tcolor: black;\n}\n');
	});

	it.skip('should find extend', () => {
		let ext = getExtend(parser('foo:extend(.bar) {  }').firstChild);

		assert(ext['.bar']);
		assert.equal(ext['.bar'].length, 1);
		assert.equal(ext['.bar'][0].extendWith, 'foo');
		assert.equal(ext['.bar'][0].all, false);

		ext = getExtend(parser('foo:extend(.bar .baz all) {  }').firstChild);
		assert.equal(ext['.bar .baz'].length, 1);
		assert.equal(ext['.bar .baz'][0].extendWith, 'foo');
		assert.equal(ext['.bar .baz'][0].all, true);

		ext = getExtend(parser('foo { &:extend(.bar); }').firstChild);
		assert.equal(ext['.bar'].length, 1);
		assert.equal(ext['.bar'][0].extendWith, 'foo');
		assert.equal(ext['.bar'][0].all, false);
	});

	it.only('should pass official samples tests', () => {
		const dir = path.resolve(__dirname, './less');
		const runTest = file => {
			const source = fs.readFileSync(path.join(dir, file), 'utf8');
			const expected = fs.readFileSync(path.join(dir, file.replace(/\.\w+$/, '.css')), 'utf8');

			const style = new LESS(source);
			assert.equal(style.transform().toCSS(true), expected, file);
		};

		runTest('extend.less');

		// fs.readdirSync(dir)
		// 	.filter(file => path.extname(file) === '.less')
		// 	.forEach(runTest);
	});
});
