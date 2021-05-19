'use strict'

const _ = require("lodash")
const { Transformer } = require("../../Utils")

class Condition {
	#builder = null
	#conditions = []
  #model = null

	constructor(builder, model = null) {
		this.#builder = builder
    this.#model = model
		this.#conditions = []
	}

	getConditions() {
		return this.#conditions.join(' ')
	}

	_getVariable(v) {
		return Transformer.transformVariable(v)
	}

	_convertField(field) {
    return Transformer.transformField(field, this.#model)
	}

	_whereQuery(type, arg1, s, q) {
		arg1 = this._convertField(arg1)

		if (_.isFunction(arg1)) {
			return type + '(' + arg1(new Condition(this.builder, this.#model)).getConditions() + ')'
		}

		if (q == undefined) {
			return `${type}${arg1} = ` + this._getVariable(s)
		}

		return `${type}${arg1} ${s} ` + this._getVariable(q)
	}

	where(arg1, s, q) {
		this.#conditions.push(this._whereQuery('', arg1, s, q))

		return this;
	}

	whereNot(arg1, s, q) {
		this.#conditions.push(this._whereQuery('NOT ', arg1, s, q))

		return this;
	}

	and(arg1, s, q) {
		this.#conditions.push(this._whereQuery('AND ', arg1, s, q))

		return this;
	}

	andNot(arg1, s, q) {
		this.#conditions.push(this._whereQuery('AND NOT ', arg1, s, q))

		return this;
	}

	or(arg1, s, q) {
		this.#conditions.push(this._whereQuery('OR ', arg1, s, q))

		return this;
	}

	xor(arg1, s, q) {
		this.#conditions.push(this._whereQuery('XOR ', arg1, s, q))

		return this;
	}

	orNot(arg1, s, q) {
		this.#conditions.push(this._whereQuery('OR NOT ', arg1, s, q))

		return this;
	}

	xorNot(arg1, s, q) {
		this.#conditions.push(this._whereQuery('XOR NOT ', arg1, s, q))

		return this;
	}

	whereRaw(q) {
		this.#conditions.push(q)

		return this;
	}

	whereBetween(field, l, r, ls, rs) {
		field = this._convertField(field)

		rs = rs ? rs : '<=';
		ls = ls ? ls : '<=';

		this.#conditions.push(this._getVariable(l) + ` ${ls} ${field} ${rs} ` + this._getVariable(r))

		return this;
	}

	whereExists(field) {
		field = this._convertField(field)

		this.#conditions.push(`exists(${field})`)

		return this;
	}

	whereId(field, q) {
		if (!q) {
			q = field
			field = ''
		}

		field = this._convertField(field)

		this.#conditions.push(`id(${field}) = ${q}`)

		return this;
	}

  whereIdIn(field, q) {
    if (!q) {
      q = field
      field = ''
    }

    field = this._convertField(field)

    this.#conditions.push(`id(${field}) IN ` + this._getVariable(q))

    return this;
  }

	whereContains(field, q) {
		field = this._convertField(field)

		this.#conditions.push(`${field} CONTAINS ` + this._getVariable(q))

		return this;
	}

	whereStartsWith(field, q) {
		field = this._convertField(field)

		this.#conditions.push(`${field} STARTS WITH ` + this._getVariable(q))

		return this;
	}

	whereEndsWith(field, q) {
		field = this._convertField(field)

		this.#conditions.push(`${field} ENDS WITH ` + this._getVariable(q))

		return this;
	}

	whereRegex(field, exp) {
		field = this._convertField(field)

		this.#conditions.push(`${field} =~ ` + this._getVariable(exp))

		return this;
	}

	whereIn(field, q) {
		field = this._convertField(field)

		this.#conditions.push(`${field} IN ` + this._getVariable(q))

		return this;
	}

	whereLabel(field, label) {
		field = this._convertField(field)

		this.#conditions.push(`${field}:${label}`)

		return this;
	}

}

module.exports = Condition
