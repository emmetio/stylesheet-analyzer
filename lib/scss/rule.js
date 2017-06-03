'use strict';

import ResolvedRule from '../resolved-rule';
import { interpolate, evaluate } from './expression';
import resolveNesting from './nesting';
import { isValidRuleForNesting, getNestingParent } from '../utils';

/**
 * A generic rule resolver: interpolates rule name and resolves nested rules
 */
export default function resolveRule(node, scope) {
	if (node.type !== 'rule') {
		return false;
	}

	const path = [];

	if (!isValidRuleForNesting(scope.parent) && scope.parent.selectors) {
		path.push(scope.parent.selectors);
	}

	path.push(node.parsedSelector);
	const selectors = resolveNesting(path).map(sel => interpolate(sel, scope.variables));
	const out = new ResolvedRule(node, scope, selectors);

	// sections must be added on top level, except media queries
	getNestingParent(scope.parent).add(out);

	return scope.next(node, scope.clone({ parent: out }));
}