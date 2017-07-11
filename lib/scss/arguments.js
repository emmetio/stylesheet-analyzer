'use strict';

import collection from './collection';
import { getType, getValue, skipSpace } from '../utils';

/**
 * Arguments parser for @mixin and @function declarations
 * @param  {Token} token Parsed CSS token with `function` type
 * @return {Argument[]}
 */
export default function(token) {
	if (getType(token) !== 'function') {
		throw new Error(`Expected token to be a "function", received "${getType(token)}"`);
	}

	return token.item(1).items
		.map(parseArgument)
		.filter(Boolean);
}

export class Argument {
	constructor(name, value, rest) {
		this.nameToken = name;
		this.valueToken = value;

		this.name = getValue(name);
		this.value = value != null ? value : null;
		this.rest = !!rest;
	}
}

/**
 * Parses function argument token
 * @param  {Token} argToken Token with `argument` type
 * @return {Argument}
 */
function parseArgument(argToken) {
	const frags = argToken.items;
	if (getType(frags[0]) === 'variable') {
		// Named argument
		const ix = skipSpace(argToken, 1);

		if (isSpread(frags, ix)) {
			return new Argument(frags[0], null, true);
		}

		if (getValue(frags[ix]) === ':') {
			return new Argument(frags[0], collection(argToken.slice(ix + 1)));
		}

		return new Argument(frags[0]);
	} else {
		// Positional argument
		return new Argument(null, collection(argToken));
	}
}

function isSpread(items, ix) {
	return getValue(items[ix]) === '.'
		&& getValue(items[ix + 1]) === '.'
		&& getValue(items[ix + 2]) === '.';
}
