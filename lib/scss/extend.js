'use strict';

import { getValue, flatten } from '../utils';

const elemShape = ['ident', 'id', 'class', 'attribute', 'pseudo'];
const combinatorTokens = new Set(['whitespace', 'comment', 'combinator', 'operator']);

/**
 * Handle `@extend` rule
 */
export default function resolveExtend(node, scope, generatedRule) {
	scope.root.children.forEach(rule => {
		node.parsedValue.forEach(value => extend(rule, value.items, generatedRule));
	});
}

/**
 * @param  {ResolvedRule} rule
 * @param  {Token[]} toExtend
 * @param  {ResolvedRule} extendWith
 * @return {Boolean}
 */
function extend(rule, toExtend, extendWith) {
	let extended = [];
	const extendWithSelectors = extendWith.parsedSelectors;

	// 1. Get each selector from given rule, e.g. '.foo, .bar' -> ['.foo', '.bar']
	rule.parsedSelectors.forEach((sel, i) => {
		extended.push(rule.selectors[i]);

		// 2. We should only try and extend element name fragments.
		// For example, in selector '.foo + .bar > a#nav' extendable fragments are
		// '.foo', '.bar' and 'a#nav'
		const fragments = selectorFragments(sel);

		for (let i = 0, il = fragments.length; i < il; i += 2) {
			if (selectorsMatch(fragments[i], toExtend)) {
				// 3. Fragment matched extend selector. Produce new selector
				// for each rule of parent container of `@extend` rule
				applyExtend(fragments[i], toExtend, extendWithSelectors)
					.forEach(extendedFrag => {
						const f = fragments.slice();
						f[i] = extendedFrag;
						extended.push(flatten(f).map(getValue).join(''));
					});
			}
		}
	});

	if (extended.length > rule.selectors.length) {
		rule.selectors = extended;
	}
}

/**
 * Splits selector by fragments. A fragment describes either element or element
 * combinator
 * @param  {Token[]} sel
 * @return {Array[]}
 */
function selectorFragments(sel) {
	let fragment = [], combinators, i = 0;
	const result = [fragment];

	while (i < sel.length) {
		if (isCombinator(sel[i])) {
			combinators = [];
			while (isCombinator(sel[i])) {
				combinators.push(sel[i++]);
			}
			result.push(combinators, fragment = []);
		} else {
			fragment.push(sel[i++]);
		}
	}

	return result;
}

/**
 * Check if given token is a combinator, e.g. used to combine element parts
 * in selector
 * @param  {Token}  token
 * @return {Boolean}
 */
function isCombinator(token) {
	return token && combinatorTokens.has(token.type);
}

/**
 * Check if `parent` selector matches `toExtend` one
 * @param  {Token[]} parent
 * @param  {Token[]} toExtend
 * @return {Boolean}
 */
function selectorsMatch(parent, toExtend) {
	if (toExtend.length > parent.length || !toExtend.length || !parent.length) {
		return false;
	}

	const lookup = new Set(parent.map(getValue));
	for (let i = 0, il = toExtend.length; i < il; i++) {
		if (!lookup.has(getValue(toExtend[i]))) {
			return false;
		}
	}

	return true;
}

/**
 * Creates extended version of `sel` where tokens from `toExtend` are replaced
 * with selectors from `extendWith`
 * @param  {Token[]} sel
 * @param  {Token[]} toExtend
 * @param  {Token[]} extendWith
 * @return {Array[]}
 */
function applyExtend(sel, toExtend, extendWith) {
	return extendWith.map(extendWithSel => {
		const lookup = new Set(toExtend.map(getValue));
		const filtered = sel.filter(frag => !lookup.has(getValue(frag)));

		return combineSelectors(filtered, extendWithSel);
	});
}

/**
 * combines two or more element selectors into a single one
 * @param  {Token[]} ...
 * @return {String}
 */
function combineSelectors() {
	const shape = elemShape.reduce((map, type) =>
		map.set(type, type === 'ident' || type === 'id' ? null : new Set()), new Map());

	// Put selectr fragments into shape
	for (let i = 0, il = arguments.length, sel; i < il; i++) {
		sel = arguments[i];

		for (let j = 0, jl = sel.length, token, target; j < jl; j++) {
			token = sel[j];

			target = shape.get(token.type);
			if (target instanceof Set) {
				target.add(getValue(token));
			} else if (shape.has(token.type)) {
				shape.set(token.type, getValue(token));
			}
		}
	}

	// Output shape as string
	let output = '';
	shape.forEach(value => {
		if (value instanceof Set) {
			output += Array.from(value).join('');
		} else if (value) {
			output += value;
		}
	});
	return output;
}
