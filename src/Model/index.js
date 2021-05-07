'use strict'

const QueryBuilder = require("../QueryBuilder")
const { RelatedToOne, RelatedToMany } = require("../Relations")
const _ = require("lodash")
const ProxyHandler =  require('./proxyHandler')
const moment = require('moment')
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const Ioc = require('../Utils/Ioc')

class Model {
  _timestamps = true
  _softDeletes = false

  $model = null
  $variable = null
  $label = null

  constructor() {
    this._instantiate()

    return new Proxy(this, ProxyHandler)
  }

  _instantiate() {
    this.__setters__ = [
      '$attributes',
      '$withRelations',
      '$relations',
      '$relationProperties',
      '$persisted',
      '$result',
      '$primaryKey',
      '$variable',
      '$frozen'
    ]

    this.$model = this.constructor.name
    this.$label = this._getLabels().join(':')
    this.$variable = this._generateVariable()
    this.$relationProperties = {}
    this.$result = {}
    this.$relations = {}
    this.$withRelations = {}
    this.$primaryKey = null
    this.$attributes = {}
    this.$persisted = false
    this.$frozen = false
  }

  _generateVariable() {
    return _.lowerCase(this.$model) + _.random(1, 100000)
  }

  _getLabels() {
    if (this._labels) {
      return this._labels
    }

    return [this.$model]
  }

  /**
   * ===============
   *  Global methods
   * ===============
   */

  get _primaryKey() {
    return '_id'
  }

  get isPersisted () {
    return this.$persisted
  }

  get isDeleted () {
    return this.$frozen
  }

  set(name, value) {
    this.$attributes[name] = value
    this.$persisted = false
  }


  /**
   * ===============
   *  Static methods
   * ===============
   */

	static query() {
		return new QueryBuilder(new this)
	}

  query() {
    return new QueryBuilder(this)
  }

  static as(variable) {
    let self = new this
    self.$variable = variable

    return self
  }

  static async create(data) {
    let self = new this

    return await self.create(data)
  }

  static async createMany(data) {
    let self = new this

    if (!_.isArray(data)) {
      throw "data must be an Array"
    }

    return await self.query()
      .withTrashed()
      .unwind(data, 'map')
      .create(m => {
        return m.node(self.$variable, self.$label)
      })
      .set(self.$variable, '$map')
      .return(self.$variable)
      .fetch()
  }

  static async all() {
    let self = new this

    return await self.query()
      .return(self.$variable)
      .fetch()
  }

  static async first() {
    let self = new this

    return await self.query()
      .return(self.$variable)
      .first()
  }

  static async last() {
    let self = new this

    return await self.query()
      .return(self.$variable)
      .orderBy(`$id(${self.$variable})`, 'DESC')
      .first()
  }

  static async find(id) {
    let self = new this

    id = _.toNumber(id)

    return await self.query()
      .where(`$id(${self.$variable})`, id)
      .return(self.$variable)
      .first()
  }

  static async findOrFail(id) {
    let model = await this.find(id);

    if (!model) {
      throw `Cannot find node for ${id} model`
    }

    return model
  }

  static async update(data) {
    let self = new this

    return await self.query()
      .set(self.$variable, data)
      .return(self.$variable)
      .fetch()
  }

  static async count() {
    let self = new this

    return await self.query()
      .count(self.$variable)
  }

  static async destroy(id, isDetach = true) {
    let self = new this
    let symbol = "="

    if (!id) {
      throw "you must specify the id(s) destroy(id, detach = true)"
    }

    if (_.isArray(id)) {
      id = _.map(id, e => {
        return _.toNumber(e)
      })
      symbol = 'IN'

    }else {
      id = _.toNumber(id)
    }

    return await self.query()
      .where(`$id(${self.$variable})`, symbol, id)
      .delete(self.$variable, isDetach)
      .fetch()
  }

  static async truncate(isDetach = true, forceDelete = false) {
    let self = new this

    return await self.query()
      .delete(self.$variable, isDetach, forceDelete)
      .fetch()
  }

  static async forceTruncate(isDetach = true) {
    return this.truncate(isDetach, true)
  }

  /**
   * ===============
   *  Instance methods
   * ===============
   */

  _getRelationModel(model) {
    return typeof model === 'string' ? Ioc.use(model) : model
  }

  relatedToOne(model, relation, isReverse = false) {
    return new RelatedToOne(this, this._getRelationModel(model), relation, isReverse)
  }

  relatedToMany(model, relation, isReverse = false) {
    return new RelatedToMany(this, this._getRelationModel(model), relation, isReverse)
  }

  getRelationProperties() {
    return this.$relationProperties
  }

  async load(relation) {
    if (!_.isFunction(this[relation])) {
      throw `there is no relation named ${relation}`
    }

    const result = await this[relation]().load()

    this.$relations[relation] = result

    return result
  }

  getRelated(relation) {
    return this.$relations[relation]
  }

  async save() {
    const data = this.$attributes
    delete data[this._primaryKey]

    if (this.$primaryKey) {
      return this.update(this.$attributes)
    }

    return this.create(this.$attributes)
  }

  fill(data) {
    this.$attributes = data

    return this;
  }

  async restore() {
    const builder = new QueryBuilder(this)

    return await builder
      .withTrashed()
      .where(`$id(${this.$variable})`, this.$primaryKey)
      .restore()
      .fetch()
  }

  async create(data) {
    const builder = new QueryBuilder(this)

    if (this._timestamps) {
      data['created_at'] = moment().format(DATE_FORMAT)
      data['updated_at'] = moment().format(DATE_FORMAT)
    }

    const response = await builder
      .create(m => m.node(this.$variable, this.$label, data))
      .withTrashed()
      .return(this.$variable)
      .first()

    this.$persisted = true
    response.$persisted = true

    return response
  }

  async update(data) {
    const builder = new QueryBuilder(this)

    if (this._timestamps) {
      data['updated_at'] = moment().format(DATE_FORMAT)
    }

    const response = await builder
      .where(`$id(${this.$variable})`, this.$primaryKey)
      .set(this.$variable, data)
      .return(this.$variable)
      .first()

    this.$persisted = true
    response.$persisted = true

    return response
  }

  async forceDelete(isDetach = true) {
    return this.delete(isDetach, true)
  }

  async delete(isDetach = true, forceDelete = false) {
    const builder = new QueryBuilder(this)

    const response = await builder
      .where(`$id(${this.$variable})`, this.$primaryKey)
      .delete(this.$variable, isDetach, forceDelete)
      .fetch()

    this.$frozen = true

    return response
  }

  toJson() {
    let result = _.merge(_.result(this, '$attributes'), _.mapValues(this.$relations, r => r.toJson()))
    const relatedProperties = _.result(this, '$relationProperties', {})

    if (!_.isEmpty(relatedProperties)) {
      result = _.merge(result, {
        __relationProperties: _.result(this, '$relationProperties')
      })
    }

    result._label = _.result(this, '$label')

    return result
  }

  toJSON() {
    return this.toJson()
  }
}

module.exports = Model
