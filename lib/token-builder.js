'use strict';

import { valueOf } from './utils';

/**
 * A wrapper for combining tokens from different streams
 */
export default class TokenBuilder {
	constructor(items) {
		this._items = [];
		this._value = null;
		if (items) {
			this.append(items);
		}
	}

	get size() {
		return this._items.length;
	}

	get length() {
		return this.valueOf().length;
	}

	get items() {
		return this._items;
	}

	item(i) {
		const len = this._items.length;
		return this._item[(i + len) % len];
	}

	append() {
		for (let i = 0, il = arguments.length, data; i < il; i++) {
			data = arguments[i];
			if (data instanceof this.constructor) {
				data = data.items;
			}
	
			if (data != null) {
				this._items = this._items.concat(data);
				this._value = null;
			}
		}

		return this;
	}

	toString() {
		return this.valueOf();
	}

	valueOf() {
		if (this._value === null) {
			this._value = this._items.map(valueOf).join('');
		}

		return this._value;
	}
}
