'use strict'

const { getConnection, getDriver, getEnv } = require("../Driver");
const Collection = require("../Collection")
const { Transformer } = require("../Utils")
const Model = require("../Model")
const Condition = require("./Condition")
const Clause = require("./Clause")
const _ = require("lodash")

class QueryBuilder {
  #model = null
  #withTrashed = false
  #freezeAutoMatch = false

  constructor(model) {
    this.#model = model;

    this._clean()
  }

   /**
   * ===============
   *  Internal methods
   * ===============
   */

  _clean() {
    this._writingCondition = false
    this.#freezeAutoMatch = false
    this._statements = []
    this._requestedRelations = []
    this._additionalReturns = []
    this._mode = "read"
    this._limit = null
  }

  _freezeAutoMatch() {
    this.#freezeAutoMatch = true
  }

  _response(records) {
    return (new Transformer(this.#model)).transformRecords(records)
  }

	_session(query, mode = 'read') {
		const { NEO4J_DATABASE } = getEnv();

    return new Promise((resolve, reject) => {
      const session = getConnection(mode).session({
      	database: NEO4J_DATABASE,
        defaultAccessMode: mode === 'read' ? getDriver().session.READ : getDriver().session.WRITE,
      })

      session
        .run(query)
        .then((result) => resolve(result.records))
        .catch((e) => {
          console.log(`ERROR: ${e.message}`)
          return reject(`ERROR: ${e.message}`)
        })
        .then(() => {
          session.close()
        })
    })
	}

  get _query() {
    this._filterSoftdeletes()

    return this._statements.join(" ")
  }

  _filterSoftdeletes() {
    if (!this.#model || !this.#model._softDeletes || this.#withTrashed) {
      return
    }

    const mIndex = _.findLastIndex(this._statements, s => _.startsWith(s, 'MATCH'))
    const oIndex = _.findLastIndex(this._statements, s => _.startsWith(s, 'OPTIONAL MATCH'))
    const wIndex = _.findLastIndex(this._statements, s => _.startsWith(s, 'WHERE'))

    const size = this._statements.length;

    if (wIndex > -1) {
      this._statements[wIndex] = `WHERE NOT exists(${this.#model.$variable}.deleted_at) AND`
    }else if (oIndex > -1) {
      this._statements.splice(oIndex + 1, 0, `WHERE NOT exists(${this.#model.$variable}.deleted_at)`)
    }else if (mIndex > -1) {
      this._statements.splice(mIndex + 1, 0, `WHERE NOT exists(${this.#model.$variable}.deleted_at)`)
    }
  }

  _prepareQueryForModel() {
    const clause = new Clause(this)
      .match(c => c.node(this.#model.$variable, this.#model.$label))

     if (!_.startsWith(_.head(this._statements), 'MATCH')) {
      this._statements.unshift(clause.getClauses())
    }
  }

  _addCondition(condition) {
    if (!this._writingCondition) {
      if (this.#model && !this.#freezeAutoMatch) {
        this._prepareQueryForModel()
      }

      this._statements.push("WHERE")


      this._writingCondition = true
    }

    this._statements.push(condition.getConditions())
  }

  _addClause(clause, autoMatch = true) {
    if (!autoMatch) {
      this.#freezeAutoMatch = true
    }
    if (autoMatch && !this.#freezeAutoMatch && this.#model) {
      this._prepareQueryForModel()

      this.#freezeAutoMatch = true
    }

    this._statements.push(clause.getClauses())
  }

   /**
   * ===============
   *  Global methods
   * ===============
   */

  /**
   * Raw
   * @param  {string} query
   * @return {Promise}
   */
	cypher(query) {
    this._statements.push(query)
    this._mode = "write"

		return this
	}

  isWithTrashed() {
    return this.#withTrashed
  }

  withTrashed() {
    this.#withTrashed = true

    return this
  }

  /**
   * First
   * @return {Promise}
   */
  async first() {
    this.limit(1);

    return (await this.fetch()).first();
  }

  /**
   * Count
   * @return {Promise}
   */
  async count(field = "*") {
    let variable = '__count' + _.random(1, 100000);
    let result = await this.return(`$count(${field}) as ${variable}`).first();

    if (_.isNumber(result)) {
      return result
    }

    return _.result(result, variable);
  }

  /**
   * toCypher
   * @return {string}
   */
  toCypher() {
    return this._query;
  }

  /**
   * toCYPHER
   * @return {string}
   */
  toCYPHER() {
    return this.toCypher();
  }

  /**
   * Fetch
   * @return {Promise}
   */
  async fetch() {
    var records = await this._session(this._query, this._mode)

    this._clean()

    return this._response(records)
  }

  /**
   * Group
   * @param  {Integer} number
   * @return {QueryBuilder}
   */
  group(c) {

    this._statements.push(c(new QueryBuilder(this.#model))._query)

    return this;
  }
  /**
   * ===============
   *  Clauses
   * ===============
   */

  /**
   * Limit
   * @param  {Integer} number
   * @return {QueryBuilder}
   */
  limit(nbr) {
    this._addClause(new Clause(this, this.#model).limit(nbr))

    return this;
  }

  /**
   * OrderBy
   * @param  {Integer} number
   * @return {QueryBuilder}
   */
  orderBy(fields, type) {
    this._addClause(new Clause(this, this.#model).orderBy(fields, type))

    return this;
  }

  /**
   * Return
   * @return {Promise}
   */
  return(...args) {
    if (!args.length) {
       args = this._additionalReturns
    }

    this._addClause(new Clause(this, this.#model).return(args))

    return this;
  }

  /**
   * withCountRelation
   * @return {Clause}
   */
  withCountRelation(relation, callback) {
    return this._withRelation(relation, callback, true)
  }


  /**
   * withRelation
   * @return {Clause}
   */
  withRelation(relation, callback, limit="") {
    return this._withRelation(relation, callback, false, limit)
  }

  /**
   * withRelation
   * @return {Clause}
   */
  _withRelation(relation, callback, isCount=false, limit="") {
    if (!this.#model) {
      return this
    }

    if (!_.isFunction(this.#model[relation])) {
      throw `can't find any relation with name ${relation}`
    }

    const newRelation = this.#model[relation]()
    const attachedToModel = new newRelation._attachedTo

    let modelAs = attachedToModel.$variable

    this.#model.$withRelations = _.merge(this.#model.$withRelations, {
      [relation]: modelAs
    })

    const withTrashed = this.isWithTrashed()

    const builder = new QueryBuilder(attachedToModel)

    const relationType = newRelation._isReverse ? 'relationIn' : 'relationOut'

    builder._freezeAutoMatch()
    let q = builder.match(o => {
      return o.node(this.#model.$variable, this.#model.$label)
    })
      .optionalMatch(o => {
        return o.node(this.#model.$variable)
          [relationType](newRelation.$variable, newRelation._relationName)
          .node(modelAs, attachedToModel.$label)
      })

    if (_.isFunction(callback)) {
      callback(q)
    }

    if (_.isNumber(callback)) {
      limit = `[..${callback}]`
    }else if (_.isNumber(limit)) {
      limit = `[..${limit}]`
    }

    let fn = isCount ? 'count' : 'collect';

    let withs = [
      `$${this.#model.$variable}`,
      `$${fn}(${newRelation.$variable})${limit} as ${modelAs}_relationProperties`,
      `$${fn}(${modelAs})${limit} as ${modelAs}_collection`
    ]

    if (this._requestedRelations.length) {
      withs = withs.concat(this._requestedRelations)
    }

    q = q.with(...withs)._query

    this._statements.push(q)

    this._additionalReturns.push(this.#model.$variable)
    this._additionalReturns.push(`$${modelAs}_collection`)
    this._additionalReturns.push(`$${modelAs}_relationProperties`)

    this._additionalReturns = _.uniq(this._additionalReturns)

    this._requestedRelations.push(`$${modelAs}_collection`)
    this._requestedRelations.push(`$${modelAs}_relationProperties`)

    return this;
  }

  /**
   * With
   * @return {Promise}
   */
  with(...args) {
    this._addClause(new Clause(this, this.#model).with(args))

    return this;
  }

  relation(field, label, params) {
    this._addClause(new Clause(this, this.#model).relation(field, label, params))

    return this;
  }

  relationIn(field, label, params) {
    this._addClause(new Clause(this, this.#model).relationIn(field, label, params))

    return this;
  }

  relationOut(field, label, params) {
    this._addClause(new Clause(this, this.#model).relationOut(field, label, params))

    return this;
  }

  relate(field, label, params) {
    this._addClause(new Clause(this, this.#model).relate(field, label, params))

    return this;
  }

  node(field, label, params) {
    this._addClause(new Clause(this, this.#model).node(field, label, params))

    return this;
  }

  match(r) {
    this._addClause(new Clause(this, this.#model).match(r), false)

    return this;
  }

  optionalMatch(r) {
    this._addClause(new Clause(this, this.#model).optionalMatch(r), false)

    return this;
  }

  unwind(field1, field2) {
    this._addClause(new Clause(this, this.#model).unwind(field1, field2), false)

    return this;
  }

  skip(val) {
    this._addClause(new Clause(this, this.#model).skip(val))

    return this;
  }

  forceDelete(field, isDetach = true) {
    this._mode = 'write'

    this._addClause(new Clause(this, this.#model).delete(field, isDetach, true))

    return this;
  }

  delete(field, isDetach = true, forceDelete = false) {
    this._mode = 'write'

    this._addClause(new Clause(this, this.#model).delete(field, isDetach, forceDelete))

    return this;
  }

  restore(field) {
    this._mode = 'write'

    this._addClause(new Clause(this, this.#model).restore(field))

    return this;
  }

  set(field, val, operator = "=") {
    this._mode = 'write'

    this._addClause(new Clause(this, this.#model).set(field, val, operator))

    return this;
  }

  update(field, val) {
    return this.set(field, val)
  }

  remove(field) {
    this._mode = 'write'

    this._addClause(new Clause(this, this.#model).remove(field))

    return this;
  }

  merge(c) {
    this._mode = 'write'

    this._addClause(new Clause(this, this.#model).merge(c))

    return this;
  }

  create(c) {
    this._mode = 'write'

    this._addClause(new Clause(this, this.#model).create(c), false)

    return this;
  }

  as(field) {
    this._addClause(new Clause(this, this.#model).as(field))

    return this;
  }

  call(field) {
    this._addClause(new Clause(this, this.#model).call(field))

    return this;
  }

  union(field) {
    this._addClause(new Clause(this, this.#model).union(field))

    return this;
  }

  onMatch() {
    this._addClause(new Clause(this, this.#model).onMatch())

    return this;
  }

  onCreate() {
    this._addClause(new Clause(this, this.#model).onCreate())

    return this;
  }

  /**
   * ===============
   *  Conditions
   * ===============
   */

  where(arg1, s, q) {
    this._addCondition(new Condition(this, this.#model).where(arg1, s, q))

    return this;
  }

  whereNot(arg1, s, q) {
    this._addCondition(new Condition(this, this.#model).whereNot(arg1, s, q))

    return this;
  }

  and(arg1, s, q) {
    this._addCondition(new Condition(this, this.#model).and(arg1, s, q))

    return this;
  }

  andNot(arg1, s, q) {
    this._addCondition(new Condition(this, this.#model).andNot(arg1, s, q))

    return this;
  }

  or(arg1, s, q) {
    this._addCondition(new Condition(this, this.#model).or(arg1, s, q))

    return this;
  }

  xor(arg1, s, q) {
    this._addCondition(new Condition(this, this.#model).xor(arg1, s, q))

    return this;
  }

  orNot(arg1, s, q) {
    this._addCondition(new Condition(this, this.#model).orNot(arg1, s, q))

    return this;
  }

  xorNot(arg1, s, q) {
    this._addCondition(new Condition(this, this.#model).xorNot(arg1, s, q))

    return this;
  }

  whereRaw(q) {
    this._addCondition(new Condition(this, this.#model).whereRaw(q))

    return this;
  }

  whereBetween(field, l, r, ls, rs) {
    this._addCondition(new Condition(this, this.#model).whereBetween(field, l, r, ls, rs))

    return this;
  }

  whereId(field, q) {
    this._addCondition(new Condition(this, this.#model).whereId(field, q))

    return this;
  }

  whereIdIn(field, list) {
    this._addCondition(new Condition(this, this.#model).whereIdIn(field, list))

    return this;
  }

  whereExists(field) {
    this._addCondition(new Condition(this, this.#model).whereExists(field))

    return this;
  }

  whereContains(field, q) {
    this._addCondition(new Condition(this, this.#model).whereContains(field, q))

    return this;
  }

  whereStartsWith(field, q) {
    this._addCondition(new Condition(this, this.#model).whereStartsWith(field, q))

    return this;
  }

  whereEndsWith(field, q) {
    this._addCondition(new Condition(this, this.#model).whereEndsWith(field, q))

    return this;
  }

  whereRegex(field, exp) {
    this._addCondition(new Condition(this, this.#model).whereRegex(field, exp))

    return this;
  }

  whereIn(field, list) {
    this._addCondition(new Condition(this, this.#model).whereIn(field, list))

    return this;
  }

  whereLabel(field, label) {
    this._addCondition(new Condition(this, this.#model).whereLabel(field, label))

    return this;
  }
}

module.exports = QueryBuilder
