'use strict';

import ResolvedNode from '../resolved-node';
import { interpolate, evaluate } from './expression';

export default function resolveProperty(node, scope) {
	if (node.type !== 'property') {
		return false;
	}

	const prefix = scope.variables['%property-prefix'] || '';
	if (node.value) {
		const name = interpolate(node.parsedName, scope.variables);
		const value = evaluate(node.value, scope.variables);
		const out = new ResolvedNode(node, scope, 'property', prefix + name, value);

		scope.parent.add(out);
	} else {
		console.warn('No value in', node.name);
	}
}
