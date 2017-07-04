'use strict';

import { skipSpace } from '../utils';

/**
 * Parses list of values from given token as a collection: either a list (Array)
 * or Map.
 * Lists are either comma- or space-separated (or both) list of items,
 * optionally grouped with braces
 *
 * List examples:
 * 1 2 3       -> [1, 2, 3]
 * 1,2,3       -> [1, 2, 3]
 * 1 2, 3 4    -> [[1, 2], [3, 4]]
 * 1, 2 3, 4   -> [[1], [2, 3], [4]]
 * (1 2) (3 4) -> [[1, 2], [3, 4]]
 * @param  {Token} source
 * @return {Array|Map}
 */
export default function collection(token) {
	return flatten(content(token).map(expand));
}

function expand(token) {
	return token && token.type === 'arguments'
		? (asMap(token) || asList(token))
		: token;
}

/**
 * Parse given (arguments) token as map
 * @param  {Token} token
 * @return {Map} Returns `null` if token cannot be parsed as map
 */
function asMap(token) {
	const result = new Map();
	for (let i = 0, il = token.size, sub; i < il; i++) {
		sub = token.item(i);

		if (sub.size < 2 || sub.item(1).property('type') !== 'propertyDelimiter') {
			return null; // Not a map, bail-out
		}

		result.set(
			sub.item(0).valueOf(),
			collection(sub.slice(skipSpace(sub, 2)))
		);
	}

	return result;
}

/**
 * Parse given (arguments) token as list
 * @param  {Token} token
 * @return {Array}
 */
function asList(token) {
	return flatten(token.items.map(arg => content(arg).map(expand)));
}

/**
 * Returns meanful inner content tokens from given parent token
 * @param  {Token} token
 * @return {Token[]}
 */
function content(token) {
	return token.items.filter(nonWhiteSpace);
}

/**
 * Check if given token isn’t a whitespace one
 * @param  {Token} token
 * @return {Boolean}
 */
function nonWhiteSpace(token) {
	return token.type !== 'whitespace';
}

function flatten(arr) {
	if (Array.isArray(arr)) {
		return arr.length === 1 ? arr[0] : arr.map(flatten);
	}

	return arr;
}
