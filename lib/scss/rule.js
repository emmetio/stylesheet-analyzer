'use strict';

import ResolvedNode from '../resolved-node';
import { interpolate, evaluate } from './expression';
import { nameForPath } from './nesting';

/**
 * A generic rule resolver: interpolates rule name and resolves nested rules
 */
export default function resolveRule(node, scope, nodeName) {
	if (node.type !== 'rule') {
		return false;
	}

	const out = new ResolvedNode(node, scope);
	const path = [];

	if (!scope.isTopmost(scope.parent)) {
		path.push(scope.parent.name);
	}

	path.push(interpolate(nodeName || node.name, scope.variables));

	out.name = nameForPath(path);

	// sections must be added on top level, except media queries
	scope.getTopmost().add(out);

	return scope.next(node, scope.clone({ parent: out }));
}
