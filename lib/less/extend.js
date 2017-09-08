'use strict';

import TokenBuilder from '../token-builder';
import { getType, getValue } from '../utils';

export default function extend(stylesheet) {
	const allNodes = getCandidates(stylesheet);
	const extendData = extractExtendData(allNodes);
	const selGraph = buildSelectorGraph(extendData);
	const lookup = new Set();

	allNodes.forEach(node => {
		lookup.add(node);

		const ext = extendData.get(node);
		if (ext && ext.length) {
			console.log('\n>> processing', node.name);
			node.selectors.forEach(sel => applyExtend(node, sel, selGraph, lookup));
		}
	});

	return stylesheet;
}

/**
 * Extracts extend data from given node set: detects `:extend()` pseudo-selector
 * in each node’s rule, removes it and returns as result
 * @param {Array} nodes
 * @return {Array}
 */
function extractExtendData(nodes) {
	return nodes.reduce((out, node) => {
		let extend = [];
		node.selectors = node.selectors.map(sel => {
			const ext = getExtend(sel);
			if (ext) {
				// Selector contains extend data: create new selector without it
				// and add to lookup
				extend = extend.concat(ext);
				return ext[0].extendWith;
			}

			return sel;
		});

		return out.set(node, extend);
	}, new Map());
}

function getCandidates(parent) {
	let result = [];

	for (let i = 0, child; i < parent.children.length; i++) {
		child = parent.children[i];
		if (child.type === 'rule') {
			result.push(child);
		} else if (child.type === 'at-rule') {
			result = result.concat(getCandidates(child));
		}
	}

	return result;
}

/**
 * Check if given selector contains instructions for extending other rules selectors.
 * If so, returns object with extend info
 * @param {TokenBuilder} selector
 * @return {Object}
 */
function getExtend(selector) {
	// Extend data must be at the end of selector
	let extendPos = -1;
	let toExtend = [];

	for (let i = 0, token; i < selector.size; i++) {
		token = selector.item(i);
		if (token === ':' && isExtendToken(selector.item(i + 1))) {
			// Token added from `&:extend()` property resolver
			if (extendPos === -1) {
				extendPos = i;
			}

			toExtend = toExtend.concat(getExtendData(selector.item(++i).item(1)));
		} else if (isExtendToken(token)) {
			// Default `:extend()` pseudo-selector
			if (extendPos === -1) {
				extendPos = i;
			}

			toExtend = toExtend.concat(getExtendData(selector.item(++i)));
		} else if (extendPos !== -1) {
			// Violation: unknown token after extend
			extendPos = -1;
			break;
		}
	}

	if (extendPos !== -1) {
		const extendWith = selector.slice(0, extendPos);
		toExtend.forEach(item => item.extendWith = extendWith);
		return toExtend;
	}
}

/**
 * Check if given token contains extend instructions
 * @param {Token} selector
 * @return {Boolean}
 */
function isExtendToken(token) {
	return getType(token) === 'pseudo' && getValue(token) === ':extend'
		|| getType(token) === 'function' && getValue(token.item(0)) === 'extend';
}

/**
 * Returns extend data from arguments token
 * @param {Token} token
 * @return {Object}
 */
function getExtendData(token) {
	return token.items.map(selector => {
		let all = false;

		if (getValue(last(selector.items)) === 'all') {
			all = true;
			selector = selector.slice(0, -2); // also remove whitespace
		}

		return { selector, all };
	});
}

/**
 * @param {Node} node
 * @param {Token|TokenBuilder} selector
 * @param {GraphBuilder} graph
 * @param {Set<Node>} lookup
 */
function applyExtend(node, selector, graph, lookup) {
	if (!graph.has(selector)) {
		console.log('no graph for selector %s', selector);
		return;
	}

	graph.get(selector).forEach(item => {
		if (selector === item.selector || node === item.node || isOrigin(selector, item.node)) {
			console.log('same selector or node, abort');
			return;
		}

		const extended = extendSelector(item.selector, item.fragment, selector, !item.all);
		if (extended) {
			console.log('extend %s with %s of node', item.selector, selector, item.node.name);
			item.node.selectors = item.node.selectors.concat(extended);
			saveOrigin(extended, node, selector._path);

			if (graph.has(item.selector)) {
				graph.set(extended, graph.get(item.selector));
				// Extended selector extends other selectors
				if (lookup.has(item.node)) {
					// Node’s extends already precessed, apply extended node
					// immediately. Otherwise wait until visitor enters node
					applyExtend(node, extended, graph, lookup);
				}
			}
		}
	});
}

/**
 * Builds selector dependency graph. This graph tells that a selector (key)
 * should extend other selectors (value)
 * @param {Map} data
 * @return {Map}
 */
function buildSelectorGraph(data) {
	const nodes = Array.from(data.keys());
	const allSelectors = buildSelectorLookup(nodes);
	const extend = new GraphBuilder(); // selector `key` extends selector in `value`

	data.forEach(items => {
		items.forEach(item => {
			allSelectors.forEach((node, selector) => {
				if (selector !== item.extendWith && canExtendSelector(selector, item.selector, !item.all)) {
					extend.add(item.extendWith, {
						selector,
						node,
						fragment: item.selector,
						all: item.all
					});
				}
			});
		});
	});

	return extend;
}

/**
 * Creates a lookup map where each key is a selector object and value is a node
 * it belongs to
 * @param {Node[]} nodes
 * @return {Map}
 */
function buildSelectorLookup(nodes) {
	return nodes.reduce((lookup, node) => {
		node.selectors.forEach(sel => lookup.set(sel, node));
		return lookup;
	}, new Map());
}

/**
 * Saves given `node` as origin of given `selector`, e.g. tells that `selector`
 * was produced by `node`
 * @param {TokenBuilder} selector
 * @param {Node} node
 * @param {Set} [prevOrigin]
 * @return {Set} Selector origin path
 */
function saveOrigin(selector, node, prevOrigin) {
	return selector._path = new Set(prevOrigin).add(node);
}

/**
 * Check if given `node` is origin (e.g. was involved in selector generation)
 * of given selector
 * @param {TokenBuilder} selector
 * @param {Node} node
 * @return {Boolean}
 */
function isOrigin(selector, node) {
	return selector._path && selector._path.has(node);
}

function matchesParent(a, b) {
	while (a = a.parent) {
		if (a === b.parent) {
			return true;
		}
	}

	return false;
}

function extendSelector(selector, target, extendWith, strict) {
	// console.log('extend %s part of %s selector with %s', target.valueOf(), selector, extendWith);
	if (strict) {
		return equals(selector, target)
			// NB should always return new instance since extended selector is
			// used as a key for lookups
			? new TokenBuilder(extendWith.items)
			: null;
	}

	// Replace all `target` occurances in `selector`
	const selSize = target.size;
	let fragments = [], prevIx = 0, ix;

	while ((ix = indexOf(selector, target, prevIx)) !== -1) {
		fragments = fragments.concat(selector.items.slice(prevIx, ix), extendWith.items);
		prevIx = ix + selSize;
	}

	if (fragments.length) {
		return new TokenBuilder(fragments.concat(selector.items.slice(prevIx)));
	}
}

function canExtendSelector(selector, target, strict) {
	return strict
		? equals(selector, target)
		: indexOf(selector, target) !== -1;
}

function indexOf(selector1, selector2, from = 0) {
	while (from < selector1.size) {
		if (matches(selector1, selector2, from)) {
			return from;
		}
		from++;
	}

	return -1;
}

function equals(selector1, selector2) {
	return selector1.size === selector2.size && matches(selector1, selector2);
}

function matches(selector1, selector2, from = 0) {
	for (let i = 0; i < selector2.size; i++) {
		if (!partsEqual(selector1.items[from++], selector2.items[i])) {
			return false;
		}
	}

	return true;
}

function partsEqual(a, b) {
	// console.log('compare %s (%s) with %s (%s)', getValue(a), getType(a), getValue(b), getType(b));
	const typeA = getType(a);
	const typeB = getType(b);

	if (typeA === typeB) {
		if (typeA === 'string') {
			// For strings, compare unquoted values
			return getValue(a.item(0)) === getValue(b.item(0));
		}

		if (typeA === 'whitespace') {
			return true;
		}

		if (typeA === 'attribute') {
			// Attributes may contain either single-, double- or un-quoted (ident)
			// tokens as value
			return getValue(a.item(0)) === getValue(b.item(0))    // name
				&& getValue(a.item(1)) === getValue(b.item(1))    // operator
				&& attrValue(a.item(2)) === attrValue(b.item(2)); // value
		}

	}

	return getValue(a) === getValue(b);
}

function attrValue(token) {
	return getValue(token && token.type === 'string' ? token.item(0) : token);
}

function last(arr) {
	return arr[arr.length - 1];
}

class GraphBuilder {
	constructor() {
		this.value = new Map();
	}

	get(key) {
		return this.value.get(key);
	}

	add(key, value) {
		if (!this.has(key)) {
			this.set(key, new Set());
		}

		this.get(key).add(value);
	}

	set(key, value) {
		this.value.set(key, value);
	}

	has(key, value) {
		if (this.value.has(key)) {
			return value != null ? this.value.get(key).has(value) : true;
		}
	}
}
