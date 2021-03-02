'use strict'

const List = require("collections/list");
const Model = require("../Model")
const _ = require("lodash")

class Collection {
	_list = null;

	constructor(els = []) {
		this._list = new List(els)
	}

	map(callback, thisp = null) {
		return this._list.map(callback, thisp);
	}

	first() {
		return this._list.peek();
	}

	toArray() {
		return this._list.toArray();
	}

	count() {
		return this._list.length;
	}

	toJson() {
		return this._list.map(e => {
			if (e && typeof e.toJson === 'function') {
				return e.toJson()
			}

			return e
		})
	}

	toJSON() {
		return this.toJson();
	}
}


module.exports = Collection
