'use strict';

import { getType, getValue } from '../utils';

/**
 * Check if given rule contains instructions for extending generated selectors.
 * If so, returns object with extend info
 * @param {Node} node 
 * @param {Scope} scope 
 * @return {Object}
 */
export function getExtend(node, scope) {
	if (node.type === 'rule') {
		// seatch for `:extend()` pseudo-selector, which should be the last
		// token of a single selector
		return node.parsedSelector.reduce((result, token) => {
			const data = isExtend(token);
			if (data) {
				data.toExtend.forEach(sel => {
					result[sel.valueOf()] = {
						extendWith: data.extendWith,
						all: data.all,
						scope
					};
				});
			}

			return result;
		}, {});
	}
}

/**
 * Check if given selector contains `:extend()` pseudo-selector
 * @param {Token} selector 
 * @return {Object} If it’s extending selector, returns extend data, `null` otherwise
 */
export function isExtend(selector) {
	const extend = selector.item(selector.size - 2);
	const args = selector.item(selector.size - 1);

	if (getType(extend) === 'pseudo' && getValue(extend) === ':extend' && getType(args) === 'arguments') {
		let all = false;
		const toExtend = args.items;

		// check for "all" option
		if (getValue(last(toExtend).item(-1)) === 'all') {
			all = true;
			toExtend[toExtend.length - 1] = last(toExtend).slice(0, -2); // also remove whitespace
		}
		
		return {
			extendWith: selector.slice(0, -2),
			toExtend,
			all
		};
	}
}

function last(arr) {
	return arr[arr.length - 1];
}
