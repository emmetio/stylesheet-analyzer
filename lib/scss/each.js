/**
 * `@each` rule resolver
 */
'use strict';

import { isWhiteSpace } from '@emmetio/stream-reader-utils';
import { variable } from '@emmetio/css-parser';
import { map, list } from './collection';
import { evaluate, interpolate } from './expression';

export default function resolveEach(node, scope, next) {
	if (node.type !== 'at-rule' || node.name !== 'each') {
		return false;
	}

	const expr = node.expressionToken;
	const data = parseExpression(expr.limit());

	if (!data) {
		return;
	}

	if (Array.isArray(data.args)) {
		eachOnList(node, scope, data.vars, data.args, next);
	} else if (data.args instanceof Map) {
		eachOnMap(node, scope, data.vars, data.args, next);
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

			console.log(variables);
		}

		console.log(node.children);

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
	args.forEach((v, k) => {
		const variables = {};
		const variableRefs = {};
		let varName;

		if (vars.length > 1) {
			varName = vars[0].valueOf();
			variables[varName] = interpolate(k.valueOf(), scope.variables);
			variableRefs[varName] = node;

			varName = vars[1].valueOf();
			variables[varName] = evaluateArgument(v, scope.variables);
			variableRefs[varName] = node;
		} else if (vars.length === 1) {
			varName = vars[0].valueOf();;
			variables[varName] = interpolate(k.valueOf(), scope.variables) + ' '
				+ evaluateArgument(arg, scope.variables);
			variableRefs[varName] = node;
		}

		next(node.children, scope.clone({ variables, variableRefs }));
	});
}

/**
 * Parses `@each` rule argumens. These arguments are described in form of
 * `$var[, $var2...] in <list or map>`
 * @param  {StreamReader} stream
 * @return {Object}
 */
function parseExpression(stream) {
	const start = stream.pos;
	let vars = [], token, args;

	while (!stream.eof()) {
		if (token = variable(stream)) {
			vars.push(token);
		} else if (eatSeparator(stream)) {
			stream.eatWhile(isWhiteSpace);
			if (args = map(stream) || list(stream)) {
				return { vars, args };
			}

			break;
		} else if (stream.eat(isWhiteSpace) || stream.eat(44) /* , */) {
			continue;
		}
	}

	stream.pos = start;
	return null;
}

function eatSeparator(stream) {
	const start = stream.pos;

	// eat 'in' keyword
	if (stream.eat(105) && stream.eat(110)) {
		stream.start = start;
		return true;
	}

	stream.pos = start;
	return false;
}

function evaluateArgument(arg, variables) {
	if (Array.isArray(arg)) {
		return arg.map(a => evaluateArgument(a, variables));
	} else if (arg instanceof Map) {
		return Array.from(arg.keys()).reduce((out, key) => {
			out[interpolate(key, variables)] = evaluateArgument(arg.get(key), variables);
			return out;
		}, {});
	} else if (arg != null) {
		return evaluate(arg.valueOf(), variables);
	}
}
