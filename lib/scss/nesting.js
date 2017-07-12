'use strict';

import { walkTokens, uniqueFilter, getValue } from '../utils';

export default function resolveNesting(path) {
	let i = 0;
	let parent = path[i++].map(getValue);

	while (i < path.length) {
		parent = resolveSelectors(path[i++], parent);
	}

	return parent.map(sel => sel.trim()).filter(Boolean);
};

/**
 * Returns positions of all &-references in given selector token
 * @param {Token} token
 * @return {Array} Array of nesting combinators
 */
function getReferences(token) {
	const result = [];

	walkTokens(token, t => {
		if (t.type === 'combinator' && t.property('type') === 'nesting') {
			result.push(t);
		}
	});

	return result;
}

/**
 * Resolves nesting for given selectors: adds `parent` selectors
 * to given `current` selectors. In simple cases, parent selectors are prepended
 * to current; if current selector contains &-references, they are
 * properly replaced with parents
 * @param  {Array}  current Current rule’s selectors
 * @param  {Array}  parent  Parent rule’s selectors
 * @return {Array}          Plain list of resolved selectors
 */
function resolveSelectors(current, parents) {
	const resolved = current.map(sel => {
		const refs = getReferences(sel);
		const selString = getValue(sel);

		// no &-references: simply prepend parent selector
		if (!refs.length) {
			return prependParent(selString, parents);
		}

		return createReplacementMatrix(refs, parents).map(row => {
			let result = selString;
			for (let i = row.length - 1, ref; i >= 0; i--) {
				ref = refs[i]
				result = result.slice(0, ref.start) + parents[row[i]] + result.slice(ref.end);
			}
		});
	});

	return mergeResolvedSelectors(resolved);
}

/**
 * Prepends given parent selectors to `sel` selector
 * @param  {String} sel     Current selectors
 * @param  {Array}  parents List of parent selectors
 * @return {Array}
 */
function prependParent(sel, parents) {
	return parents.map(parent => `${parent} ${sel}`);
}

/**
 * Create replacement matrix where each rows’ length is a number of
 * &-refences in selector and each cell points to parent selector
 * @param  {Array} refs
 * @param  {Array} parents
 * @return {Array}
 */
function createReplacementMatrix(refs, parents, row, out) {
	row = row || [];
	out = out || [];

	for (let i = 0, il = parents.length, cur; i < il; i++) {
		cur = row.slice(0);
		cur.unshift(i);
		if (row.length < refs.length) {
			createReplacementMatrix(refs, parents, cur, out);
		} else {
			out.push(row);
		}
	}

	return out;
}

function unique(arr) {
	return arr.filter(uniqueFilter);
}

function mergeResolvedSelectors(resolved) {
	resolved = resolved.map(unique);

	if (resolved.length == 1) {
		return resolved[0];
	}

	const longestSel = resolved.reduce((a, b) => a.length > b.length ? a : b);
	const out = [];

	for (let i = 0, il = longestSel.length; i < il; i++) {
		for (let j = 0, jl = resolved.length; j < jl; j++) {
			if (resolved[j][i]) {
				out.push(resolved[j][i]);
			}
		}
	}

	return out;
}
