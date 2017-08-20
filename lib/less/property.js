'use strict';

import ResolvedNode from '../resolved-node';
import { interpolate, evaluate } from './expression';
import { isExtendProperty } from './extend';

const reImportant = /\s*!important\s*$/;
const reUseMagic = /^font$/i;

export default function resolveProperty(node, scope) {
	if (node.type !== 'property' || (node.parsedName.type === 'at-keyword' && node.name !== '@import')) {
		return false;
	}

	if (scope.parent === scope.root || isExtendProperty(node)) {
		// do not output properties into root or `&:extend()` properties
		return true;
	}

	let ctx = scope.variables;
	const important = scope.important || reImportant.test(node.value);
	const name = interpolate(node.name, ctx);

	if (reUseMagic.test(name)) {
		ctx = Object.create(ctx);
		ctx['%magic-div'] = 1;
	}

	const value = evaluate(node.value.replace(reImportant, ''), ctx)
		+ (important ? ' !important' : '');
	const out = new ResolvedNode(node, scope, 'property', name, value);

	scope.parent.add(out);
}
