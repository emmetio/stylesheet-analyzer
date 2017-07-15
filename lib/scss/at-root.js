/**
 * `@at-root` rule resolver
 */
'use strict';

import { parseMediaExpression } from '@emmetio/css-parser';
import collection from './collection';
import { evaluate, interpolate } from './expression';
import ResolvedRule from '../resolved-rule';
import { getNestingParent, getValue } from '../utils';

export default function resolveAtRoot(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'at-root') {
		return false;
	}

	const data = parse(node, scope);
	let target = getInsertionPoint(node, data, scope);

	if (data.selectors.length) {
		// The node creates a new rule, e.g. `@at-root .foo { ... }`
		const out = new ResolvedRule(node, scope, data.selectors.map(getValue));
		target.add(out);
		target = out;
	}

	next(node.children, scope.clone({ parent: target }));
}

function parse(node, scope) {
	let selectors = parseMediaExpression(interpolate(node.expression), scope.variables);
	let condition;

	if (selectors[0]) {
		// @at-root should have either selector or `(with|without: ...)` condition
		const map = collection(selectors[0]);
		if (map instanceof Map) {
			condition = map.entries().next().value;
			selectors = [];
		}
	}

	return { condition, selectors };
}

function getInsertionPoint(node, data, scope) {
	let insertion = getNestingParent(scope.parent);

	if (!data.condition) {
		return insertion;
	}

	const values = Array.isArray(data.condition[1])
		? data.condition[1].map(token => evaluate(token, scope.variables))
		: [ evaluate(data.condition[1], scope.variables) ];

	if (data.condition[0] === 'without') {
		if (values.includes('all')) {
			return scope.root;
		}

		if (insertion.type === 'at-rule' && values.includes(insertion.name)) {
			insertion = insertion.parent;

			if (scope.parent.type === 'rule') {
				const out = new ResolvedRule(node, scope, scope.parent.selectors);
				scope.root.add(out);
				insertion = out;
			}

		}
	} else if (data.condition[0] === 'with') {
		if (values.includes('rule') && scope.parent.type === 'rule') {
			const out = new ResolvedRule(node, scope, scope.parent.selectors);
			scope.root.add(out);
			insertion = out;
		}
	}

	return insertion;
}
