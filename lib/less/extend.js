'use strict';

import { getType, getValue } from '../utils';

/**
 * @param {ResolvedStylesheet} stylesheet
 */
export default function extend(stylesheet) {
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

/**
 * Creates extend lookup for every selector in stylesheet
 * @param {ResolvedRule[]} nodes
 * @return {Map}
 */
function createLookup(nodes) {
	const lookup = new Map();
	const add = sel => lookup.set(sel, getExtend(sel));

	nodes.forEach(node => node.selectors.forEach(add));

	return lookup;
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
 * @param {TokenBuilder} node 
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
				extendPos = i++;
			}

			toExtend = toExtend.concat(getExtendData(selector.item(i).item(1)));
		} else if (isExtendToken(token)) {
			// Default `:extend()` pseudo-selector
			if (extendPos === -1) {
				extendPos = i++;
			}

			toExtend = toExtend.concat(getExtendData(selector.item(i)));
		} else if (extendPos !== -1) {
			// Violation: unknown token after extend
			extendPos = -1;
			break;
		}
	}

	const extendWith = extendPos !== -1 ? selector.slice(0, extendPos) : null;
	return extendWith ? { extendWith, extendPos, toExtend } : null;
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
	let all = false;
	const toExtend = token.items;

	// check for "all" option
	if (getValue(last(toExtend).item(-1)) === 'all') {
		all = true;
		toExtend[toExtend.length - 1] = last(toExtend).slice(0, -2); // also remove whitespace
	}

	return toExtend.map(selector => ({ selector, all }));
}

function extendMatchingCandidates(extData, candidates, lookup) {
	extData.toExtend.forEach(item => {
		candidates.forEach(node => {
			if (matchesNode(node, lookup, item.selector, item.all)) {
				node.selectors = node.selectors.concat(extData.extendWith);
			}
		});
	});
}

function matchesNode(node, lookup, selector, all) {
	for (let i = 0, sel, ext; i < node.selectors.length; i++) {
		sel = node.selectors[i];
		ext = lookup.get(ext);
		// Should match against clear selector, without extend
		if (matchesSelector(ext ? ext.extendWith : sel, selector, all)) {
			return true;
		}
	}

	return false;
}

function matchesSelector(toExtend, extendWith, all) {
	if (all) {
		// Check if one selector contains all parts from another
		return extendWith.items.every(a => toExtend.items.some(b => partsEqual(a, b)));
	} else {
		// Use strict equality
		return toExtend.items.every((token, i) => partsEqual(token, extendWith.items[i]));
	}
}

function partsEqual(a, b) {
	const type = getType(a);
	if (type === getType(b)) {
		if (type === 'string') {
			// For strings, compare unquoted values
			return getValue(a.item(0)) === getValue(b.item(0));
		}

		if (type === 'attribute') {
			// Attributes may contain either single-, double- or un-quoted (ident) 
			// tokens as value
			return getValue(a.item(0)) === getValue(b.item(0))    // name
				&& getValue(a.item(1)) === getValue(b.item(1))    // operator
				&& attrValue(a.item(2)) === attrValue(b.item(2)); // value
		}

		return getValue(a) === getValue(b);
	}

	return false;
}

function attrValue(token) {
	return getValue(token && token.type === 'string' ? token.item(0) : token);
}

function last(arr) {
	return arr[arr.length - 1];
}
