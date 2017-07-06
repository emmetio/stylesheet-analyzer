'use strict';

import collection from './collection';

/**
 * Arguments parser for @mixin and @function declarations
 * @param  {Token} token Parsed CSS token, mostly one with `arguments` type
 * @return {Map}
 */
export default function(token, scope) {
	const args = collection(token);
	const result = new Map();

	if (Array.isArray(args)) {
		return args.reduce((out, arg) => {
			if (arg = parseArgument(arg, scope)) {
				out.set(arg.name, arg.value);
			}

			return out;
		}, result);
	} else if (args instanceof Map) {
		args.forEach((value, name) => result.set(name, toPrimitive(value, scope)));
	}

	return result;
}

function parseArgument(arg, scope) {
	if (Array.isArray(arg)) {
		// argument with default value: `$a: 5`
		arg = arg.filter(filterWhitespace);
		if (arg[0].type === 'variable' && arg[1].valueOf() === ':') {
			return {
				name: arg[0].valueOf(),
				value: toPrimitive(arg[2], scope)
			};
		}
	}

	return {
		name: arg.valueOf(),
		value: null
	};
}

function toPrimitive(token, scope) {
	if (token == null) {
		return null;
	}

	if (token.type === 'variable') {
		return scope && scope[token.valueOf()];
	}

	if (token.type === 'number') {
		return Number(token.item(0).valueOf());
	}

	if (token.type === 'string') {
		return token.item(0).valueOf();
	}

	return token.valueOf();
}

function filterWhitespace(token) {
	return token && token.type !== 'whitespace';
}
