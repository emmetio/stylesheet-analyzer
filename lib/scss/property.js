'use strict';

import ResolvedNode from '../resolved-node';
import { interpolate, evaluate } from './expression';

export default function resolveProperty(node, scope) {
	if (node.type !== 'property') {
		return false;
	}

	const name = interpolate(node.parsedName, scope.variables);
	const value = evaluate(node.value, scope.variables);
	const out = new ResolvedNode(node, scope, 'property', name, value);

	scope.parent.add(out);
}
