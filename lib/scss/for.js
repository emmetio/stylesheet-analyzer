/**
 * `@for` rule resolver
 */
'use strict';

import { evaluate } from './expression';

export default function resolveFor(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'for' || !node.parsedExpression[0]) {
		return false;
	}

	const dfn = node.parsedExpression[0].items.filter(item => !expect(item, 'whitespace'));

	const counterToken = expect(dfn[0], 'variable');
	const startToken = expect(dfn[1], 'ident', 'from') && dfn[2];
	const endToken = (expect(dfn[3], 'ident', 'through') || expect(dfn[3], 'ident', 'to')) && dfn[4];

	if (counterToken && startToken && endToken) {
		let start = toNumber(startToken, scope);
		const end = toNumber(endToken, scope) + (dfn[3].valueOf() === 'through' ? 1 : 0);
		const varName = counterToken.valueOf();

		while (!isNaN(start) && !isNaN(end) && start < end) {
			next(node.children, scope.clone({
				variables: { [varName]: start++ },
				variableRefs: { [varName]: node }
			}));
		}
	}
}

function toNumber(token, scope) {
	return Number(evaluate(token, scope.variables));
}

function expect(token, type, value) {
	if (token && token.type === type && (value == null || token.valueOf() === value)) {
		return token;
	}
}
