/**
 * Variable resolver for SCSS
 */
'use strict';

import { evaluate } from './expression';

export default function resolveVariable(node, scope, next) {
	if (node.type === 'property' && node.parsedName.type === 'variable') {
		scope.variables[node.name] = evaluate(node.value, scope.variables);
		scope.variableRefs[node.name] = node;
		return true;
	}

	return false;
};
