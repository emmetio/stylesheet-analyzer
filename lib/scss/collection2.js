'use strict';

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
	for (let i = 0, il = token.size, frags; i < il; i++) {
		frags = content(token.item(i));

		if (!frags[1] || frags[1].valueOf() !== ':') {
			return null; // Not a map, bail-out
		}

		result.set(frags[0].valueOf(), expand(frags[2]));
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

function content(token) {
	return token.items.filter(nonWhiteSpace);
}

function nonWhiteSpace(token) {
	return token.type !== 'whitespace';
}

function flatten(arr) {
	return arr.length === 1
		? arr[0]
		: (Array.isArray(arr) ? arr.map(flatten) : arr);
}
