/**
 * `@media` rule resolver
 */
'use strict';

import { evaluate, interpolate } from './expression';
import collection from './collection';
import ResolvedAtRule from '../resolved-at-rule';
import ResolvedRule from '../resolved-rule';
import { getNestingParent } from '../utils';

export default function resolveMedia(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'media') {
		return false;
	}

	let expr = node.parsedExpression
		.map(item => evalMediaExpression(item, scope))
		.join(', ');

	const nestingTarget = getNestingParent(scope.parent);
	if (nestingTarget.type === 'at-rule' && nestingTarget.name === node.name) {
		// Found @media as insertion point: merge expressions
		expr = `${nestingTarget.expression}${expr ? ' and ' + expr : ''}`;
	}

	const out = new ResolvedAtRule(node, scope, node.name, expr);
	scope.root.add(out);

	// Find best insertion target which is not media query.
	// This resolves the following case:
	// .sel { @media { ... } }
	// ...which should be converted to
	// @media { .sel { ... } }
	let parent = out;
	if (scope.parent.type === 'rule') {
		parent = new ResolvedRule(node, scope, scope.parent.selectors);
		out.add(parent);
	}

	next(node.children, scope.clone({ parent }));
}

function evalMediaExpression(token, scope) {
	return expand(collection(token), scope);
}

function expand(item, scope) {
	if (Array.isArray(item)) {
		// list
		return item.map(inner => expand(inner, scope)).join(' ');
	} else if (item instanceof Map) {
		// map
		const entries = Array.from(item.entries())
			.map(entry => `${evaluate(entry[0], scope.variables)}: ${expand(entry[1], scope)}`);
		return `(${entries.join(', ')})`;
	}

	return evaluate(item, scope.variables);
}
