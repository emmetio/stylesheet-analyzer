'use strict';

import { getType, getValue } from '../utils';

/**
 * @param {String} selector Selector to extend
 * @param {Object} extendData Parsed extend data
 */
export default function extend(selector, extendData) {
	const extendWith = extendData.extendWith.valueOf();
	findRulesToExtend(extendData.scope.parent, selector)
		.forEach(rule => rule.selectors = rule.selectors.concat(extendWith));
}

/**
 * Check if given rule contains instructions for extending generated selectors.
 * If so, returns object with extend info
 * @param {Node} node 
 * @param {Scope} scope 
 * @return {Object}
 */
export function getExtend(node, scope) {
	const result = {};

	if (node.type === 'rule') {
		// Search for `:extend()` pseudo-selector, which should be the last
		// token of a single selector
		collectExtendsFromRule(node, scope, result);

		// Search for `&:extend()` properties in given rule
		collectExtendsFromProperties(node, scope, result);
	}

	return result;
}

/**
 * Check if given selector contains `:extend()` pseudo-selector
 * @param {Token} selector 
 * @return {Object} If it’s extending selector, returns extend data, `null` otherwise
 */
export function isExtendSelector(selector) {
	const pseudo = selector.item(selector.size - 2);

	return getType(pseudo) === 'pseudo' && getValue(pseudo) === ':extend';
}

/**
 * Check if given property node is used for extend, e.g. `&:extend()`
 * @param {Node} node 
 * @return {Boolean}
 */
export function isExtendProperty(node) {
	if (node.type === 'property' && node.name === '&') {
		const value = node.parsedValue[0];
		const fn = value && value.item(0);
		return getType(fn) === 'function' && getValue(fn.item(0)) === 'extend';
	}
}

/**
 * Collects extend data from rule definition like `foo:extend(bar)` and writes 
 * it into `result` object
 * @param {Node} node 
 * @param {Scope} scope 
 * @param {Object} result 
 * @return {Object}
 */
function collectExtendsFromRule(node, scope, result) {
	node.parsedSelector.forEach(token => {
		if (isExtendSelector(token)) {
			collectExtend(token.slice(0, -2), token.item(token.size - 1), scope, result);
		}
	});

	return result;
}

/**
 * Collects extend data from rule’s special properties like `&:extend(foo)` and 
 * qrites it into `result` object
 * @param {Node} node 
 * @param {Scope} scope 
 * @param {Object} result 
 * @return {Object}
 */
function collectExtendsFromProperties(node, scope, result) {
	const extendWithSelectors = node.parsedSelector.map(sel => 
		isExtendSelector(sel) ? sel.slice(0, -2) : sel);

	node.children.forEach(child => {
		if (isExtendProperty(child)) {
			const fn = child.parsedValue[0].item(0);
			extendWithSelectors.forEach(extendWith => {
				collectExtend(extendWith, fn.item(1), scope, result);
			});
		}
	});

	return result;
}

function collectExtend(extendWith, args, scope, result) {
	getExtendData(args).forEach(data => {
		const sel = data.selector.valueOf();
		if (!(sel in result)) {
			result[sel] = [];
		}

		result[sel].push({
			extendWith,
			all: data.all,
			scope
		});
	});
}

/**
 * Finds rules inside given parent rule that macthes given `selector`
 * @param {ResolvedNode} parent 
 * @param {String} selector 
 */
function findRulesToExtend(parent, selector) {
	const result = [];
	const walk = node => node.children.forEach(child => {
		if (child.type === 'rule' && containsSelector(child, selector)) {
			result.push(child);
		} else if (child.type === 'at-rule') {
			walk(child);
		}
	});

	walk(parent);
	return result;
}

/**
 * Returns extend data from arguments token
 * @param {Token} token 
 * @return {Object}
 */
function getExtendData(token) {
	let all = false;
	const toExtend = token.items;

	// check for "all" option
	if (getValue(last(toExtend).item(-1)) === 'all') {
		all = true;
		toExtend[toExtend.length - 1] = last(toExtend).slice(0, -2); // also remove whitespace
	}

	return toExtend.map(selector => ({ selector, all }));
}

function containsSelector(rule, selector) {
	return rule.selectors.includes(selector);
}

function last(arr) {
	return arr[arr.length - 1];
}
