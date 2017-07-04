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

	it('should interpolate rule', () => {
		const style = new SCSS('$foo: bar; .test#{$foo} { padding: 0 }');
		assert.equal(style.transform().toCSS(true), '.testbar {\n\tpadding: 0;\n}\n');
	});

	it('should resolve variables', () => {
		const style = new SCSS('$a: 10px; $b: $a * 2; foo { padding: $a + $b; }');
		assert.equal(style.transform().toCSS(true), 'foo {\n\tpadding: 30px;\n}\n');
	});

	it('should resolve @each rule', () => {
		let style;

		style = new SCSS(`@each $animal in puma, sea-slug, egret, salamander {
		  .#{$animal}-icon {
		    background-image: url('/images/#{$animal}.png');
		  }
		}`);

		assert.equal(style.transform().toCSS().trim(),
`.puma-icon {
	background-image: url('/images/puma.png');
}
.sea-slug-icon {
	background-image: url('/images/sea-slug.png');
}
.egret-icon {
	background-image: url('/images/egret.png');
}
.salamander-icon {
	background-image: url('/images/salamander.png');
}`);

		style = new SCSS(`@each $animal, $color, $cursor in (puma, black, default),
                                  (sea-slug, blue, pointer),
                                  (egret, white, move) {
		  .#{$animal}-icon {
		    background-image: url('/images/#{$animal}.png');
		    border: 2px solid $color;
		    cursor: $cursor;
		  }
		}`);

		assert.equal(style.transform().toCSS().trim(),
`.puma-icon {
	background-image: url('/images/puma.png');
	border: 2px solid black;
	cursor: default;
}
.sea-slug-icon {
	background-image: url('/images/sea-slug.png');
	border: 2px solid blue;
	cursor: pointer;
}
.egret-icon {
	background-image: url('/images/egret.png');
	border: 2px solid white;
	cursor: move;
}`);

		style = new SCSS(`@each $header, $size in (h1: 2em, h2: 1.5em, h3: 1.2em) {
			#{$header} {
				font-size: $size;
			}
		}`);

		assert.equal(style.transform().toCSS().trim(),
`h1 {
	font-size: 2em;
}
h2 {
	font-size: 1.5em;
}
h3 {
	font-size: 1.2em;
}`);

	});

	it('should resolve @media rule', () => {
		let style;
		style = new SCSS(`.sidebar { width: 300px; @media screen and (orientation: landscape) { width: 500px; } }`);
		assert.equal(style.transform().toCSS(), `.sidebar {\n\twidth: 300px;\n}\n@media screen and (orientation: landscape) {\n\t.sidebar {\n\t\twidth: 500px;\n\t}\n}\n`);

		style = new SCSS(`@media screen { .sidebar { @media (orientation: landscape) { width: 500px; } } }`);
		assert.equal(style.transform().toCSS(true), `@media screen and (orientation: landscape) {\n\t.sidebar {\n\t\twidth: 500px;\n\t}\n}\n`);

		style = new SCSS(`$m: screen; $f: min-device-pixel-ratio; $v: 1.5; @media #{$m} and ($f: $v) { .sidebar { width: 500px; } }`);
		assert.equal(style.transform().toCSS(true), `@media screen and (min-device-pixel-ratio: 1.5) {\n\t.sidebar {\n\t\twidth: 500px;\n\t}\n}\n`);
	});

	it('should resolve @at-root rule', () => {
		let style;

		style = new SCSS(`.parent { foo: 1; @at-root .child { bar: 2 } }`);
		assert.equal(style.transform().toCSS(true), '.parent {\n\tfoo: 1;\n}\n.child {\n\tbar: 2;\n}\n');

		style = new SCSS(`.parent { foo: 1; @at-root { .child1 { bar: 2 } .child2 { bar: 3 } } }`);
		assert.equal(style.transform().toCSS(true), '.parent {\n\tfoo: 1;\n}\n.child1 {\n\tbar: 2;\n}\n.child2 {\n\tbar: 3;\n}\n');

		style = new SCSS(`@media print { .page { width: 8in; @at-root (without: media) { color: red; } } }`);
		assert.equal(style.transform().toCSS(true), '@media print {\n\t.page {\n\t\twidth: 8in;\n\t}\n}\n.page {\n\tcolor: red;\n}\n');
	});
});
