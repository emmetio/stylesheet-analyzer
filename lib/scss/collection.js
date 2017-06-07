'use strict';

import StreamReader from '@emmetio/stream-reader';
import { isSpace } from '@emmetio/stream-reader-utils';
import { value } from '@emmetio/css-parser';

const LBRACE = 40;
const RBRACE = 41;
const COMMA  = 44;
const COLON  = 58;

/**
 * Parses list of values from given string.
 * Lists are either comma- or space-separated (or both) list of items,
 * optionally grouped with braces
 *
 * List examples:
 * 1 2 3       -> [1, 2, 3]
 * 1,2,3       -> [1, 2, 3]
 * 1 2, 3 4    -> [[1, 2], [3, 4]]
 * 1, 2 3, 4   -> [[1], [2, 3], [4]]
 * (1 2) (3 4) -> [[1, 2], [3, 4]]
 * @param  {String|StreamReader} source
 * @return {Array}
 */
export function list(source) {
	const stream = getStream(source);
	const start = stream.pos;

	const result = createList(',');
	const push = item =>
		(!Array.isArray(item) || item.length) && result.push(item);

	let ctx = createList(), token;

	while (!stream.eof()) {
		if (token = value(stream)) {
			ctx.push(token);
		} else if (token = collection(stream)) {
			// nested list or map
			push(ctx);
			result.push(token);
			ctx = createList();
		} else if (stream.eat(COMMA)) {
			push(ctx);
			ctx = createList();
		} else if (stream.eat(COLON)) {
			// it’s a map, bail out
			result.length = ctx.length = 0;
			break;
		} else if (!stream.eatWhile(isSpace)) {
			break;
		}
	}

	push(ctx);

	if (!result.length) {
		// not a list, bail out
		stream.pos = start;
		return null;
	}

	return result.length === 1
		? result[0]
		: result.map(item => item.length === 1 ? item[0] : item);
}

/**
 * Parse map from given list. A map is `(key: value, ...)` expression
 * @param  {StreamReader|String} source
 * @return {Map}
 */
export function map(source) {
	const stream = getStream(source);
	const start = stream.pos;

	// A map should always start with (
	if (stream.eat(LBRACE)) {
		const map = new Map();
		let entry;

		while (!stream.eof()) {
			if (entry = mapEntry(stream)) {
				map.set(entry.key.valueOf(), entry.value);
			} else if (stream.eat(RBRACE)) {
				return map;
			} else if (!(stream.eat(COMMA) || stream.eatWhile(isSpace))) {
				// Unknown token, bail out. Could be a list
				break;
			}
		}
	}

	stream.pos = start;
	return null;
}

/**
 * Consumes collection in braces from given stream: either map or list
 * @param  {StreamReader|String} source
 * @return {Array|Map}
 */
export function collection(source) {
	const stream = getStream(source);
	const start = stream.pos;
	let item;

	if (item = map(stream)) {
		return item;
	} else if (stream.eat(LBRACE) && (item = list(stream)) && stream.eat(RBRACE)) {
		return item;
	}

	stream.pos = start;
	return null;
}

function mapEntry(stream) {
	const start = stream.pos;
	let k, v;

	if ((k = value(stream)) && skipSpace(stream)
		&& stream.eat(COLON) && skipSpace(stream)
		&& (v = collection(stream) || value(stream))
	) {
		return { key: k, value: v };
	} else {
		stream.pos = start;
		return null;
	}
}

function createList(separator) {
	const result = [];
	result.separator = separator || ' ';
	return result;
}

function getStream(source) {
	return typeof source === 'object' ? source : new StreamReader(source);
}

function skipSpace(stream) {
	stream.eatWhile(isSpace);
	return true;
}
