/**
 * Variable resolver for SCSS
 */
'use strict';

import { evaluate } from './expression';

const VAR_START = 36; // $

export default function resolveVariable(node, scope, next) {
	if (node.type !== 'property' || node.name.charCodeAt(0) !== VAR_START) {
		return false;
	}

	scope.variables[node.name] = evaluate(node.value, scope.variables);
	scope.variableRefs[node.name] = node;
};
