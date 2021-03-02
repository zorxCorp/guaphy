'use strict'

const _ = require("lodash")
const { Transformer } = require("../../Utils")
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const moment = require('moment')

class Clause {
	#builder = null
	#clauses = []
  #model = null

	constructor(builder, model = null) {
		this.#builder = builder
    this.#model = model
		this.#clauses = []
	}

  _getModelName(model) {
    if (_.isString(model)) {
      return model
    }

    if(_.isFunction(model)) {
      return (new model).constructor.name
    }

    return model.constructor.name
  }

  _generateRelationVariable(n1, n2) {
    return _.lowerCase(this._getModelName(n1))
      + '_'
      + _.lowerCase(this._getModelName(n2))
      + _.random(1, 100000)
  }

  _convertField(field) {
    return Transformer.transformField(field, this.#model)
  }

	getClauses(join = ' ') {
		return this.#clauses.join(join)
	}

	_getVariable(v) {
		return Transformer.transformVariable(v)
	}

	/**
   * Limit
   * @param  {Integer} number
   * @return {Clause}
   */
  limit(nbr) {
    this.#clauses.push(`LIMIT ${nbr}`)

    return this;
  }

  /**
   * OrderBy
   * @param  {Integer} number
   * @return {Clause}
   */
  orderBy(fields, type) {
    type = type ? ` ${type}` : ''

    if (!_.isArray(fields)) {
      fields = [fields]
    }

    let q = [];

    _.each(fields, field => {
      field = this._convertField(field)

      if (_.isObject(field)) {
        q.push(_.map(field, (v, k) => `${k} ${v}`).join(','))
      }else{
        q.push(`${field}${type}`)
      }
    })

    this.#clauses.push('ORDER BY ' + q.join(','))



    return this;
  }

  /**
   * Return
   * @return {Clause}
   */
  return(args) {
    if (_.isArray(args) && !args.length) {
      args = ''
    }

    args = _.isArray(args) ? _.map(args, field => this._convertField(field)) : this._convertField(args)

    this.#clauses.push(`RETURN ${args}`)

    return this;
  }

  /**
   * With
   * @return {Clause}
   */
  with(args) {
    if (!_.isArray(args)) {
      args = [args]
    }

    args = _.map(args, field => this._convertField(field))

    this.#clauses.push(`WITH ${args}`)

    return this;
  }

  _constructQuery(field, label, params) {
    // field = field ? this._convertField(field) : ''
  	field = field ? field : ''

		if (_.isObject(label)) {
			params = label
			label = null
		}

    label = label ? `:${label}` : ''
    params = params ? ' ' + this._getVariable(params) : ''

    return `${field}${label}${params}`
  }

  node(field, label, params) {
  	this.#clauses.push('(' + this._constructQuery(field, label, params) + ')')

    return this;
  }

  _relation(field, label, params, l = '-', r = '-') {
  	let q = ''

  	if (_.isFunction(field)) {
			q = field(new Clause(this.#builder, this.#model)).getClauses('|')
  	}else{
  		q = this._constructQuery(field, label, params)
  	}


  	return q ? `${l}[${q}]${r}` : `${l}${r}`
  }

  relation(field, label, params) {
  	let q = this._relation(field, label, params)

  	this.#clauses.push(q)

  	return this
  }

  relationIn(field, label, params) {
  	let q = this._relation(field, label, params, '<-', '-')

  	this.#clauses.push(q)

  	return this
  }

  relationOut(field, label, params) {
  	let q = this._relation(field, label, params, '-', '->')

  	this.#clauses.push(q)

  	return this
  }

  relate(field, label, params) {
  	this.#clauses.push(this._constructQuery(field, label, params))

    return this;
  }

  _match(c) {
  	let m = ''

  	if (_.isArray(c)) {
  		return _.map(c, f => this._match(f))
  	}

  	if (_.isFunction(c)) {
			m = c(new Clause(this.#builder, this.#model)).getClauses()
  	}

  	return [m ? ` ${m}` : '']
  }

  match(c) {
  	let q = this._match(c).join(',')

  	this.#clauses.push(`MATCH${q}`)

    return this;
  }

  optionalMatch(c) {
    let q = this._match(c).join(',')

    this.#clauses.push(`OPTIONAL MATCH${q}`)

    return this;
  }

  unwind(f1, f2) {
  	f1 = _.isString(f1) ? '$'+f1 : f1
  	f2 = _.isString(f2) ? '$'+f2 : f2

  	this.#clauses.push('UNWIND ' + this._getVariable(f1) + ' AS ' + this._getVariable(f2))

  	return this
  }

  skip(v) {
  	this.#clauses.push(`SKIP ${v}`)

  	return this
  }

  delete(field, isDetach = true, isForce = false) {
    if (this.#model && this.#model._softDeletes && !isForce) {
      return this.set({deleted_at : moment().format(DATE_FORMAT)})
    }

    field = this._convertField(field)

  	let q = `DELETE ${field}`

  	if (isDetach) {
  		q = `DETACH ${q}`
  	}

  	this.#clauses.push(q)

  	return this
  }

  restore(field) {
    field = this._convertField(field)

    let q = `${field}.deleted_at = null`

    this.#clauses.push(`SET ${q}`)

    return this
  }

  set(field, val) {
  	let q = '';

  	if (_.isObject(field)) {
  		q = _.map(field, (v, k) => this._convertField(k) + ' = ' + this._getVariable(v)).join(',')
  	}else {
  		q = this._convertField(field) + ' = ' + this._getVariable(val)
  	}

  	this.#clauses.push(`SET ${q}`)

  	return this
  }

  remove (field) {
    field = this._convertField(field)

  	this.#clauses.push(`REMOVE ${field}`)

  	return this
  }

  merge(c) {
  	let m = "";

  	if (_.isFunction(c)) {
			m = ' ' + c(new Clause(this.#builder, this.#model)).getClauses()
  	}

  	this.#clauses.push(`MERGE${m}`)

    return this;
  }

  _create(c) {
    let m = ''

    if (_.isArray(c)) {
      return _.map(c, f => this._create(f))
    }

    if (_.isFunction(c)) {
      m = c(new Clause(this.#builder, this.#model)).getClauses()
    }

    return [m ? ` ${m}` : '']
  }

  create(c) {
    let q = this._create(c).join(',')

    this.#clauses.push(`CREATE${q}`)

    return this;
  }

  as(field) {
    field = this._convertField(field)

  	this.#clauses.push(`AS ${field}`)

    return this;
  }

  call(field) {
  	let q = '';

  	if (_.isString(field)) {
  		q = field
  	}

  	if (_.isFunction(field)) {
			q = '{ ' + field(new Clause(this.#builder, this.#model)).getClauses() + ' }'
  	}

  	this.#clauses.push(`CALL ${q}`)

    return this;
  }

  union(field) {
  	field = field ? ` ${field}` : ''

  	this.#clauses.push(`UNION${field}`)

    return this;
  }

  onMatch(field) {
  	this.#clauses.push('ON MATCH')

    return this;
  }

  onCreate() {
  	this.#clauses.push('ON CREATE')

    return this;
  }
}

module.exports = Clause
