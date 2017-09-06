'use strict';

import TokenBuilder from '../token-builder';
import { getType, getValue } from '../utils';

/**
 * @param {ResolvedStylesheet} stylesheet
 */
export function extendOld(stylesheet) {
	const allNodes = getCandidates(stylesheet);
	const lookup = createLookup(allNodes);

	const run = (parent, candidates) => parent.children.forEach(child => {
		if (child.type === 'rule') {
			const localCandidates = candidates.filter(node => node !== child);

			child.selectors = child.selectors.map(sel => {
				const ext = lookup.get(sel);
				if (ext) {
					extendMatchingCandidates(ext, localCandidates, lookup);
					return ext.extendWith;
				}

				return sel;
			});
		} else if (child.type === 'at-rule') {
			run(child, getCandidates(child));
		}
	});

	run(stylesheet, allNodes);

	return stylesheet;
}

export default function extend(stylesheet) {
	const allNodes = getCandidates(stylesheet);
	const extendData = extractExtendData(allNodes);
	const graph = buildNodeGraph(extendData);
	const selGraph = buildSelectorGraph(extendData);
	debugGraph(graph);
	debugSelectorGraph(selGraph);

	allNodes.forEach(node => applyExtend(node, extendData, graph));
	return stylesheet;
}


export function extendOld2(stylesheet) {
	const allNodes = getCandidates(stylesheet);
	const candidatesByParent = new Map().set(stylesheet, allNodes);
	const selectors = new Map();
	const deps = new Map();

	// 1. Collect all nodes/selectors that should extend and clean-up original
	// selectors
	extractExtendData(allNodes).forEach(ext => {
		// 2. Get extend candidates that match current node
		const ctx = ext.node.parent;
		if (!candidatesByParent.has(ctx)) {
			candidatesByParent.set(ctx, getCandidates(ctx));
		}
		
		// const candidates = candidatesByParent.get(ctx).filter(item => item !== ext.node);
		const candidates = candidatesByParent.get(ctx);

		// 3. Build dependency graph for each extended selector.
		// A dependency graph tells that selector A must be extended with B, and
		// B must be extended by C and so on
		ext.toExtend.forEach(item => {
			candidates.forEach(node => {
				node.selectors.forEach(sel => {
					if (sel !== ext.extendWith && canExtendSelector(sel, item.selector, !item.all)) {
						if (!deps.has(sel)) {
							deps.set(sel, { node, extendWith: [] });
						}

						deps.get(sel).extendWith.push({
							selector: ext.extendWith,
							target: item.selector,
							strict: !item.all
						});
					}
				});
			});
		});

		// 3. Find matching selectors from candidates and extend them but keep
		// result in separate map in order to not recursively extend the extend 
		// product
		// ext.toExtend.forEach(item => {
		// 	candidates.forEach(node => {
		// 		node.selectors.forEach(sel => {
		// 			const extended = extendSelector(sel, item.selector, ext.extendWith, !item.all);
		// 			if (extended) {
		// 				if (!selectors.has(node)) {
		// 					selectors.set(node, node.selectors.slice());
		// 				}

		// 				selectors.get(node).push(extended);
		// 			}
		// 		});
		// 	});
		// });
	});

	// 4. Resolve selectors: add extended versions of extended selectors 
	// to their nodes
	const cache = new Map();
	deps.forEach((ext, selector) => {
		// ext.node.selectors = getResolved(selector, deps, cache);
		const extended = getResolved(selector, deps, cache);
		ext.node.selectors = ext.node.selectors.concat(extended);
	});

	// 4. Apply extended selectors to their nodes
	// selectors.forEach((selectors, node) => node.selectors = selectors);

	return stylesheet;
}

/**
 * 
 * @param {Map} deps 
 * @param {TokenBuilder} selector 
 * @param {Map} [cache] 
 * @param {Set} [guard] 
 * @return {Array}
 */
function getResolved(selector, deps, cache, guard) {
	if (!deps.has(selector) || (guard && ( guard.has(selector) || guard.size > 100) )) {
		// No selector dependencies or circular reference, return as is
		return [selector];
	}

	// Has already resolved selector
	if (cache && cache.has(selector)) {
		return cache.get(selector);
	}

	guard = guard || new Set();

	// Add selector to guard set to protect from circular references
	guard.add(selector);
	const result = deps.get(selector).extendWith.reduce((out, item) => {
		const resolved = getResolved(item.selector, deps, cache, guard)
			.map(rSel => extendSelector(selector, item.target, rSel, item.strict));

		return out.concat(resolved);
	}, [selector]);
	guard.delete(selector);

	if (cache) {
		cache.set(selector, result);
	}

	console.log('resolved selector for %s is', getValue(selector), result.map(getValue));

	return result;
}


/**
 * Creates extend lookup for every selector in stylesheet
 * @param {ResolvedRule[]} nodes
 * @return {Map}
 */
function createLookup(nodes) {
	const lookup = new Map();
	const add = sel => {
		const ext = getExtend(sel);
		ext && lookup.set(sel, ext);
	};

	nodes.forEach(node => node.selectors.forEach(add));

	return lookup;
}

/**
 * Exttracts extend data from given node set: detects `:extend()` pseudo-selector
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

function extendMatchingCandidates(extData, candidates, lookup) {
	extData.toExtend.forEach(item => {
		candidates.forEach(node => {
			const selectors = node.selectors;

			node.selectors.forEach(sel => {
				if (lookup.has(sel)) {
					sel = lookup.get(sel).extendWith;
				}

				if (!item.all) {
					if (equals(sel, item.selector)) {
						selectors.push(extData.extendWith);
					}
				} else {
					// Replace all occurances of selector
					const selSize = item.selector.size;
					let fragments = [], prevIx = 0, ix;

					while ((ix = indexOf(sel, item.selector, prevIx)) !== -1) {
						fragments = fragments.concat(sel.items.slice(prevIx, ix), extData.extendWith.items);
						prevIx = ix + selSize;
					}

					if (fragments.length) {
						fragments = fragments.concat(sel.items.slice(prevIx));
						// console.log('push: %s', new TokenBuilder(fragments));
						selectors.push(new TokenBuilder(fragments));
					}
				}
			});

			node.selectors = selectors;
		});
	});
}

/**
 * Applies `extend()` from given node to given candidates, if possible
 * @param {Node} node 
 * @param {Map} extendData 
 * @param {Map} graph 
 * @param {Set} [guard]
 */
function applyExtend(node, extendData, graph, guard) {
	guard = guard || new Set();

	// Apply dependent nodes first
	if (!guard.has(node) && graph.has(node)) {
		guard.add(node);
		graph.get(node).forEach(dep => applyExtend(dep, extendData, graph, guard));
	}

	const toExtend = extendData.get(node);
	if (toExtend && toExtend.length) {
		// Find nodes that should be extended by current one and extend them
		graph.forEach((value, dep) => {
			if (value.has(node)) {
				toExtend.forEach(item => {
					const extended = dep.selectors
						.map(sel => extendSelector(sel, item.selector, item.extendWith, !item.all))
						.filter(Boolean);

					if (extended.length) {
						dep.selectors = dep.selectors.concat(extended);
					}
				});
			}
		});
		extendData.delete(node);
	}
}

/**
 * Builds dependency graph for each node in given extend data.
 * A graph tells that a node (key) should be extended by other nodes (value)
 * @param {Map} data 
 * @return {Map<Node, Set>}
 */
function buildNodeGraph(data) {
	const nodes = Array.from(data.keys());
	const graph = new Map();

	data.forEach((items, extendBy) => {
		items.forEach(item => {
			nodes.forEach(node => {
				for (let i = 0, sel; i < node.selectors.length; i++) {
					sel = node.selectors[i];
					if (sel !== item.extendWith && extendBy !== node && canExtendSelector(sel, item.selector, !item.all)) {
						if (!graph.has(node)) {
							graph.set(node, new Set());
						}

						graph.get(node).add(extendBy);
						break;
					}
				}
			});
		});
	});

	return graph;
}

/**
 * Builds selector dependency graph. This graph tells that a selector (key) 
 * should extend other selectors (value)
 * @param {Map} data 
 * @return {Map}
 */
function buildSelectorGraph(data) {
	const nodes = Array.from(data.keys());
	const allSelectors = nodes.reduce((out, node) => out.concat(node.selectors), []);
	const extend = new GraphBuilder();
	const extendedBy = new GraphBuilder();

	data.forEach(items => {
		items.forEach(item => {
			allSelectors.forEach(sel => {
				if (sel !== item.extendWith && canExtendSelector(sel, item.selector, !item.all)) {
					extend.add(item.extendWith, sel);
					extendedBy.add(sel, item.extendWith);
				}
			});
		});
	});

	return { extend, extendedBy };
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

function matchesParent(a, b) {
	while (a = a.parent) {
		if (a === b.parent) {
			return true;
		}
	}

	return false;
}

function extendSelector(selector, target, extendWith, strict) {
	console.log('extend %s part of %s selector with %s', target.valueOf(), selector, extendWith);
	if (strict) {
		return equals(selector, target) ? extendWith : null;
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

function debugGraph(graph) {
	graph.forEach((deps, node) => {
		console.log('%s is extended by [%s]', node.name, Array.from(deps).map(node => node.name).join(', '));
	});
}

function debugSelectorGraph(graph) {
	graph.forEach((deps, sel) => {
		console.log('%s extends [%s]', sel, Array.from(deps).join(', '));
	});
}

class GraphBuilder {
	constructor() {
		this.value = new Map();
	}

	add(key, value) {
		if (!this.value.has(key)) {
			this.value.set(key, new Set());
		}

		this.value.get(key).add(value);
	}

	has(key, value) {
		if (this.value.has(key)) {
			return value != null ? this.value.get(key).has(value) : true;
		}
	}
}
