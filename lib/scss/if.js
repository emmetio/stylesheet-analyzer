/**
 * `@if` rule resolver
 */
'use strict';

import { isTruthy } from './expression';
import { skipSpace } from '../utils';

export default function resolveIf(node, scope, next) {
	if (node.type !== 'at-rule') {
		return false;
	}

	if (node.name === 'else') {
		// A sibling `@else` rule from parent resolver: skip it
		return true;
	}

	if (node.name !== 'if') {
		return false;
	}

	if (isTruthy(getExpression(node), scope.variables)) {
		// Successfully evaluated `@if` branch
		return next(node.children, scope);
	}

	let ctx = node.nextSibling, expr;
	while (ctx && ctx.type === 'at-rule' && ctx.name === 'else') {
		expr = getExpression(ctx);

		if (!expr || isTruthy(expr, scope.variables)) {
			// NB empty `expr` means `@else` branch, otherwise it’s `@else if`
			return next(ctx.children, scope);
		}

		ctx = ctx.nextSibling;
	}
}

function getExpression(node) {
	let expression = node.parsedExpression[0];

	// could be `@else` or `@else if`
	if (node.name === 'else' && expression && expression.item(0) == 'if') {
		expression = expression.slice(skipSpace(expression, 1));
	}

	return expression;
}
