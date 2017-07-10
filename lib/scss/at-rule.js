'use strict';

import ResolvedAtRule from '../resolved-at-rule';
import { isValidRuleForNesting, getNestingParent } from '../utils';

/**
 * General at-rule handler: outputs any unmatchet by previous handlers at-rules as-is
 * @param  {Node}     node
 * @param  {Scope}    scope
 * @param  {Function} next
 * @return {Boolean}
 */
export default function resolveAtRule(node, scope, next) {
	if (node.type !== 'at-rule') {
		return false;
	}

	const out = new ResolvedAtRule(node, scope, node.name, node.expression);

	// at-rules must be added on top level, except media queries
	getNestingParent(scope.parent).add(out);

	next(node.children, scope.clone({ parent: out }));
}
