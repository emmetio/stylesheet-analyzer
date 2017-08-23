'use strict';

import TokenBuilder from '../token-builder';
import { flatten } from '../utils';

/**
 * Nesting resolver for LESS: builds new selector by combining parts of `path`
 * argument. All `&` tokens in selectors will be replaced with parent selectors
 */
export default function resolveNesting(path) {
	return path.length > 1 
		? path.reduce(resolveSelectors) 
		: path[0].map(createTokenBuilder);
}

/**
 * Resolves nesting for given selectors: adds `parent` selectors
 * to given `current` selectors. In simple cases, parent selectors are prepended
 * to current; if current selector contains &-references, they are
 * properly replaced with parents
 * @param  {Array}  parent Parent rule’s selectors
 * @param  {Array}  child  Child rule’s selectors
 * @return {Array}         Plain list of resolved selectors
 */
function resolveSelectors(parent, child) {
	let resolved = child.map(sel => {
		const refs = getReferences(sel);

		// no &-references: simply prepend parent selector
		if (!refs.length) {
			return parent.map(parentSel => combineSelectors(parentSel, sel));
		}

		return createReplacementMatrix(refs, parent).map(row => {
			// Replace each reference token in child selector with corresponding
			// parent selector
			let i = 0;
			return sel.items.reduce((out, token) => 
				out.append(isReferenceToken(token) ? parent[row[i++]].items : token), new TokenBuilder());
		});
	});

	return flatten(resolved);
}

/**
 * Returns all &-references in given selector token
 * @param {Token} token
 * @return {Array} Array of nesting combinators in `token`
 */
function getReferences(token) {
	return token.items.filter(isReferenceToken);
}

/**
 * Check if given token is a reference, e.g. `&`
 * @param {Token} token 
 * @return {Boolean}
 */
function isReferenceToken(token) {
	return token.type === 'combinator' && token.property('type') === 'nesting';
}

/**
 * Combines two selector tokens into one
 * @param {Token|TokenBuilder} parent
 * @param {Token} child 
 * @return {Token}
 */
function combineSelectors(parent, child) {
	return createTokenBuilder(parent).append(' ', child.items);
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

function createTokenBuilder(token) {
	return new TokenBuilder(token.type === 'selector' ? token.items : token);
}
