'use strict';

import { parseSelector } from '@emmetio/css-parser';
import ResolvedRule from '../resolved-rule';
import { interpolate } from './expression';
import resolveNesting from './nesting';
import { isValidRuleForNesting, getNestingParent } from '../utils';

/**
 * A generic rule resolver: interpolates rule name and resolves nested rules
 * @param {Rule} node
 * @param {Scope} scope
 * @param {Function} next
 */
export default function resolveRule(node, scope, next) {
	if (node.type !== 'rule') {
		return false;
	}

	// 1. Interpolate raw selector
	const rawSelector = interpolate(node.selector, scope.variables);

	// 2. Collect scope for nesting
	const path = [];
	if (!isValidRuleForNesting(scope.parent) && scope.parent.selectors) {
		path.push(scope.parent.selectors);
	}

	// 2. Parse selector into tokens
	path.push(parseSelector(rawSelector));

	const out = new ResolvedRule(node, scope, resolveNesting(path));

	// sections must be added on top level, except media queries
	getNestingParent(scope.parent).add(out);

	next(node.children, scope.clone({
		parent: out,
		variables: {}, 
		variableRefs: {}
	}));
}
