'use strict';

import { getValue } from '../utils';

const fragmentsOrder = ['ident', 'id', 'class', 'attribute', 'pseudo'];

/**
 * Handle `@extend` rule
 */
export default function resolveExtend(node, scope, generatedRule) {
	scope.root.children.forEach(rule => {
		node.parsedValue.forEach(value => {
			extend(rule, value.items, generatedRule);
		});
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
	rule.parsedSelectors.forEach((sel, i) => {
		extended.push(rule.selectors[i]);

		if (selectorsMatch(sel, toExtend)) {
			extended = extended.concat(applyExtend(sel, toExtend, extendWithSelectors));
		}
	});

	if (extended.length > rule.selectors.length) {
		rule.selectors = extended;
	}
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
 * [applyExtend description]
 * @param  {Token[]} sel
 * @param  {Token[]} toExtend
 * @param  {Token[]} extendWith
 * @return {Array[]}
 */
function applyExtend(sel, toExtend, extendWith) {
	return extendWith.map(extendWithSel => {
		const lookup = new Set(toExtend.map(getValue));
		const filtered = sel.filter(frag => !lookup.has(getValue(frag)))

		return extendWithSel.concat(filtered)
		.sort(sortByType)
		.map(getValue)
		.join('');
	});
}

function sortByType(a, b) {
	return fragmentsOrder.indexOf(a.type) - fragmentsOrder.indexOf(b.type);
}
