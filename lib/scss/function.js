/**
 * `@function` rule resolver
 */
'use strict';

import { evaluate } from './expression';
import parseArguments from './arguments';

export default function resolveFunction(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'function') {
		return false;
	}

	const expr = node.parsedExpression[0];
	if (!expr.size || expr.item(0).type !== 'function') {
		return;
	}

	// In given function definition token, the first item is a function name
	// and second is an arguments list. Otherwise, it won’t have `function` type
	const fn = compileFunction(expr);

	console.log('fn def', fn);
}

/**
 * Compiles SASS function definition into a real function that can be used in
 * expressions
 * @param  {Token} token Function definition token (with type 'function').
 * In given token, the first item is a function name and second is an arguments
 * list. Otherwise, it won’t have `function` type
 * @return {Function}
 */
function compileFunction(token, scope) {
	const name = token.item(0).valueOf();
	const args = parseArguments(token.item(1), scope.variables);

	console.log('fn def', fn);
	return {
		name: token.item(0).valueOf(),
		body() {
			const args = Array.from(arguments);

		}
	};
}
