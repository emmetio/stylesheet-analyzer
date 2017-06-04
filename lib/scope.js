'use strict';

/**
 * A helper object for preprocessor resolvers (LESS, SCSS)
 * for holding transformation state.
 * Provides methods for safe cloning and extending scope
 */
export default class Scope {
    constructor(data) {
        this.extend(data);
    }

    clone(data) {
        return new this.constructor(this).extend(data);
    }

    extend(data) {
        if (isObject(data)) {
            const extendProps = this.constructor.extendProps;

            Object.keys(data).forEach(key => {
                let value = data[key];
                if (extendProps.has(key) && isObject(this[key]) && isObject(value)) {
                    value = Object.assign(Object.create(this[key]), value);
                }
                this[key] = value;
            });
        }

		return this;
    }
}

Scope.extendProps = new Set('variables', 'mixins', 'variableRefs', 'mixinRefs');

function isObject(obj) {
    return obj != null && typeof obj === 'object';
}
