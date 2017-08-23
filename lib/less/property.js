'use strict';

import ResolvedNode from '../resolved-node';
import { interpolate, evaluate } from './expression';
import { getType, getValue } from '../utils';

const reImportant = /\s*!important\s*$/;
const reUseMagic = /^font$/i;

export default function resolveProperty(node, scope) {
	if (node.type !== 'property' || (node.parsedName.type === 'at-keyword' && node.name !== '@import')) {
		return false;
	}

	if (scope.parent === scope.root) {
		// do not output properties into root
		return true;
	}

	if (isExtendProperty(node)) {
		return handleExtend(node, scope);
	}

	let ctx = scope.variables;
	const important = scope.important || reImportant.test(node.value);
	const name = interpolate(node.name, ctx);

	if (reUseMagic.test(name)) {
		ctx = Object.create(ctx);
		ctx['%magic-div'] = 1;
	}

	const value = evaluate(node.value.replace(reImportant, ''), ctx)
		+ (important ? ' !important' : '');
	const out = new ResolvedNode(node, scope, 'property', name, value);

	scope.parent.add(out);
}

/**
 * Check if given property node is used for extend, e.g. `&:extend()`
 * @param {Node} node 
 * @return {Boolean}
 */
function isExtendProperty(node) {
	if (node.name === '&') {
		const value = node.parsedValue[0];
		const fn = value && value.item(0);
		return getType(fn) === 'function' && getValue(fn.item(0)) === 'extend';
	}
}

/**
 * handles `&:extend()` property
 * @param {Node} node 
 * @param {Scope} scope 
 */
function handleExtend(node, scope) {
	const fn = node.parsedValue[0].item(0);
	if (scope.parent.type === 'rule') {
		// add `extend()` value as a pseudo-selector for each parent selector
		scope.parent.selectors = scope.parent.selectors.map(sel => sel.append(':', fn));
	}

	return true;
}
