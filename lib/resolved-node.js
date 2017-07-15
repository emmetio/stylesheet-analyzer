'use strict';

/**
 * A structure that holds resolved data about original
 * propercessor stylesheet node
 */
export default class ResolvedNode {
	constructor(ref, scope, type, name, value) {
		this.ref = ref;
		this.scope = scope;
		this.type = type;
		this.name = name;
		this.value = value;

		this.parent = null;
		this.children = [];
	}

	/**
	 * Returns current element’s index in parent list of child nodes
	 * @return {Number}
	 */
	index() {
		return this.parent ? this.parent.children.indexOf(this) : -1;
	}

	/**
	 * Adds given node as a child
	 * @param {Node} node
	 * @return {Node} Current node
	 */
	add(node) {
		if (node) {
			node.remove();
			this.children.push(node);
			node.parent = this;
		}
		return this;
	}

	/**
	 * Removes current node from its parent
	 * @return {Node} Current node
	 */
	remove() {
		if (this.parent) {
			const ix = this.index();
			if (ix !== -1) {
				this.parent.children.splice(ix, 1);
				this.parent = null;
			}
		}

		return this;
	}

	toCSS(skipEmpty, indent) {
		indent = indent || '';
		const sep = !/^@/.test(this.name) ? ': ' : ' ';
		return indent + this.name + sep + this.value + ';';
	}
}
