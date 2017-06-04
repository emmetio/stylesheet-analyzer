'use strict';

import StreamReader from '@emmetio/stream-reader';
import { isQuote, isSpace } from '@emmetio/stream-reader-utils';
import { value } from '@emmetio/css-parser';

const COMMA  = 44;
const LBRACE = 40;
const RBRACE = 41;

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
 * @param  {String|StreamReader} str
 * @return {Array}
 */
export function list(str) {
	const stream = typeof str === 'object' ? str : new StreamReader(str);

	const result = new SCSSList(',');
	let list = result.push(new SCSSList());
	let ctx = result;
	let token;

	while (!stream.eof()) {
		if (token = value(stream)) {
			list.push(token);
		} else if (stream.eat(COMMA)) {
			list = ctx.push(new SCSSList());
			stream.eatWhile(isSpace);
		} else if (stream.eat(LBRACE)) {
			ctx = ctx.push(new SCSSList(','));
			list = ctx.push(new SCSSList());
		} else if (stream.eat(RBRACE)) {
			ctx = ctx.parent;
			if (!ctx) {
				throw stream.error('Unexpected ")"');
			}
		} else if (!stream.eatWhile(isSpace)) {
			throw stream.error('Unexpected character');
		}
	}

	return flatten(result);
}

export class SCSSList {
	constructor(separator) {
		this.separator = separator || ' ';
		this.items = [];
		this.parent = null;
	}

	push(value) {
		if (value instanceof this.constructor) {
			value.parent = this;
		}
		this.items.push(value);
		return value;
	}

	toString() {
		return this.items.join(this.separator === ',' ? ', ' : this.separator);
	}

	valueOf() {
		return this.items;
	}

	toJSON() {
		return this.items;
	}
}

function flatten(item) {
	if (item instanceof SCSSList)  {
		if (!item.items.length) {
			return null;
		}
		if (item.separator === ',' && item.items.length === 1) {
			item = item.items[0];
		}

		item.items = item.items.map(flatten).filter(notNull);
	}

	return item;
}

function notNull(item) {
	return item !== null;
}
