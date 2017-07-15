/**
 * `@function` rule resolver
 */
'use strict';

import { parsePropertyValue } from '@emmetio/css-parser';
import { evaluate, interpolate } from './expression';
import parseArguments from './arguments';
import { getType } from '../utils';

export default function resolveFunction(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'function') {
		return false;
	}

	const expr = node.parsedExpression[0];
	if (getType(expr.item(0)) === 'function') {
		// In given function definition token, the first item is a function name
		// and second is an arguments list. Otherwise, it won’t have `function` type
		const fn = compileFunction(expr.item(0), node, scope, next);
		scope.variables[fn.name] = fn.body;
		scope.variableRefs[fn.name] = node;
	}
}

/**
 * Compiles SASS function definition into a real function that can be used in
 * expressions
 * @param  {Token} token Function definition token (with type 'function').
 * In given token, the first item is a function name and second is an arguments
 * list. Otherwise, it won’t have `function` type
 * @param  {Node}  node
 * @param  {Scope} scope
 * @return {Function}
 */
function compileFunction(token, node, scope, next) {
	const defaultArgs = parseArguments(token);

	return {
		name: token.item(0).valueOf(),
		body() {
			const args = Array.from(arguments);
			// Collect argument variables

			const variables = defaultArgs.reduce((out, arg, i) => {
				if (arg.rest) {
					out[arg.name] = args.slice(i);
				} else {
					out[arg.name] = args[i] || arg.value;
				}
				return out;
			}, {});

			scope = scope.clone({ variables });

			let result;
			node.children.forEach(child => {
				if (child.type === 'property' && child.name === '@return') {
					const expr = interpolate(child.value, scope.variables);
					result = parsePropertyValue(expr).map(expr => evaluate(expr, scope.variables)).join(', ');
				} else {
					next(child, scope);
				}
			});

			return result;
		}
	};
}
