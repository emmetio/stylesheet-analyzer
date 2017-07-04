/**
 * `@each` rule resolver
 */
'use strict';

import collection from './collection';
import { evaluate } from './expression';
import { skipSpace } from '../utils';

export default function resolveEach(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'each') {
		return false;
	}

	const data = parseExpression(node.parsedExpression);

	if (data) {
		let args = data.args.map(collection);
		if (args.length === 1) {
			args = args[0];
		}

		if (Array.isArray(args)) {
			eachOnList(node, scope, data.vars, args, next);
		} else if (args instanceof Map) {
			eachOnMap(node, scope, data.vars, args, next);
		}
	}
}

/**
 * Parses `@each` rule arguments. These arguments are described in form of
 * `$var[, $var2...] in <list or map>`
 * @param  {Token} list
 * @return {Object}
 */
function parseExpression(items) {
	if (!items || !items.length) {
		return null;
	}

	// Extract `$var` arguments until `in` keyword is found,
	// the rest is value
	for (let i = 0, il = items.length, vars = [], token; i < il; i++) {
		token = items[i];

		for (let j = 0, jl = token.size, frag; j < jl; j++) {
			frag = token.item(j);

			if (frag.type === 'variable') {
				vars.push(frag);
			} else if (frag.type === 'ident' && frag.valueOf() === 'in') {
				const args = items.slice(i + 1);
				// Add the rest subtokens as first item in arguments list
				j = skipSpace(token, j + 1);
				if (j < token.size) {
					args.unshift(token.slice(j));
				}

				return { vars, args };
			}
		}
	}
}

/**
 * Runs `@each` expression over list of argumens
 * @param  {Node} node
 * @param  {Scope} scope
 * @param  {Array} vars
 * @param  {Array} args
 * @param  {Function} next
 */
function eachOnList(node, scope, vars, args, next) {
	args.forEach(arg => {
		const variables = {};
		const variableRefs = {};
		let varName;

		if (vars.length > 1 && Array.isArray(arg)) {
			for (let i = 0; i < vars.length; i++) {
				varName = vars[i].valueOf();
				variables[varName] = evaluateArgument(arg[i], scope.variables);
				variableRefs[varName] = node;
			}
		} else if (vars.length === 1) {
			varName = vars[0].valueOf();
			variables[varName] = evaluateArgument(arg, scope.variables);
			variableRefs[varName] = node;
		}

		next(node.children, scope.clone({ variables, variableRefs }));
	});
}

/**
 * Runs `@each` expression over map of argumens
 * @param  {Node} node
 * @param  {Scope} scope
 * @param  {Array} vars
 * @param  {Map} args
 * @param  {Function} next
 */
function eachOnMap(node, scope, vars, args, next) {
	args.forEach((v, k) => eachOnList(node, scope, vars, [[k, v]], next));
}

function evaluateArgument(arg, variables) {
	if (Array.isArray(arg)) {
		return arg.map(a => evaluateArgument(a, variables));
	} else if (arg instanceof Map) {
		const result = [];
		arg.forEach((value, key) => result[key] = evaluateArgument(value, variables));
		return result;
	} else if (arg != null) {
		return evaluate(arg.valueOf(), variables);
	}
}
