/**
 * `@at-root` rule resolver
 */
'use strict';

import collection from './collection';
import { evaluate, interpolate } from './expression';
import ResolvedRule from '../resolved-rule';
import { skipSpace, getNestingParent } from '../utils';

export default function resolveAtRoot(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'at-root') {
		return false;
	}

	const data = parse(node);
	let target = getInsertionPoint(node, data, scope);

	if (data.selectors.length) {
		// The node creates a new rule, e.g. `@at-root .foo { ... }`
		const out = new ResolvedRule(node, scope, data.selectors.map(token => interpolate(token, scope.variables)));
		target.add(out);
		target = out;
	}

	next(node.children, scope.clone({ parent: target }));
}

function parse(node) {
	let selectors = node.parsedExpression, condition;

	if (selectors[0]) {
		// Try to extract `(with|without: ...)` condition
		const map = collection(selectors[0].slice(0, 1));
		if (map instanceof Map) {
			condition = map.entries().next().value;

			// Build a new selector without condition
			if (selectors[0].size > 1) {
				selectors = [ selectors[0].slice(skipSpace(selectors[0], 1)) ]
					.concat(selectors.slice(1));
			} else {
				selectors = [];
			}
		}
	}

	return { condition, selectors };
}

function getInsertionPoint(node, data, scope) {
	if (!data.condition) {
		return scope.root;
	}

	let insertion = getNestingParent(scope.parent);
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
		// TODO implement
	}

	return insertion;
}
