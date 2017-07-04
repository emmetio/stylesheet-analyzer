/**
 * `@at-root` rule resolver
 */
'use strict';

import collection from './collection';
import { evaluate } from './expression';

export default function resolveAtRule(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'at-root') {
		return false;
	}

	const exprToken = node.parsedExpression && node.parsedExpression[0];
	if (exprToken) {
		// TODO check for `(with: ...)` and `(without: ...)` map
	}

	console.log('at-root parsed', node.parsedExpression);
}
