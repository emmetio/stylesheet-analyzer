'use strict';

import { walkTokens, uniqueFilter, getValue } from '../utils';

/**
 * Nesting resolver for LESS: builds new selector by combining parts of `path`
 * argument. All `&` tokens in selectors will be replaced with parent selectors
 */
export default function resolveNesting(path) {
	let i = 0;
	let parent = path[i++].map(getValue);

	while (i < path.length) {
		parent = resolveSelectors(path[i++], parent);
	}

	return parent.map(sel => sel.trim()).filter(Boolean);
}

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
				ref = refs[i];
				result = result.slice(0, ref.start) + parents[row[i]] + result.slice(ref.end);
			}

			return result;
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
 * Builds replacement matrix: an array containing array of indexes 
 * of parent selectors that should be substituted instead of &-references
 * @param  {Array} refs Array of &-references
 * @param  {Array} parents Array of parent selectors
 * @return {Array}
 */
function createReplacementMatrix(refs, parents) {
	const total = Math.pow(parents.length, refs.length);
	const out = [], row = [];

	for (let i = 0; i < refs.length; i++) {
		row[i] = 0;
	}

	for (let i = 0, ix; i < total; i++) {
		out.push(row.slice(0));
		ix = row.length - 1;

		// incrementally update indexes of row
		while (ix >= 0) {
			row[ix] = (row[ix] + 1) % parents.length;
			if (row[ix] || !ix) {
				break;
			}
			ix--;
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
