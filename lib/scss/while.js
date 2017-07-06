/**
 * `@while` rule resolver
 */
'use strict';

import { isTruthy } from './expression';

export default function resolveWhile(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'while') {
		return false;
	}

	let loopProtector = 10000;
	const expr = node.parsedExpression[0];

	while (isTruthy(expr, scope.variables) && loopProtector--) {
		next(node.children, scope);
	}
}
