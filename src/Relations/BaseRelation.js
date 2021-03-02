'use strict'
const _ = require("lodash")
const QueryBuilder = require("../QueryBuilder")
const ProxyHandler =  require('../Model/proxyHandler')
const moment = require('moment')
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss'

class BaseRelation {
  _parent = null
  _attachedTo = null
  _relationName = null
  _isReverse = null

  constructor(parent, attachedTo, relationName, isReverse = false) {
    this._parent = parent
    this._attachedTo = attachedTo
    this._relationName = relationName
    this._isReverse = isReverse

    this.$variable = this._generateVariable()
    this._instantiate()

    return new Proxy(this, ProxyHandler)
  }

  _instantiate() {
    this.__setters__ = [
      '$attributes',
      '$result',
      '$primaryKey',
    ]

    this.$result = {}
    this.$primaryKey = null
    this.$attributes = {}
  }

  get _primaryKey() {
    return '_id'
  }

  _getModelName(model) {
    if (!model) {
      return ''
    }

    if (_.isString(model)) {
      return model
    }

    if(_.isFunction(model)) {
      return (new model).constructor.name
    }

    return model.constructor.name
  }

  _generateVariable() {
    return _.lowerCase(this._getModelName(this._parent))
      + '_'
      + _.lowerCase(this._getModelName(this._attachedTo))
      + _.random(1, 100000)
  }

  _isLinkingCorrectModel(model) {
    return model.constructor.name == this._getModelName(this._attachedTo)
  }

  async detach(model) {
    if (!this._isLinkingCorrectModel(model)) {
      throw "can't detach the wrong model"
    }

    const relationType = this._isReverse ? 'relationIn' : 'relationOut'

    return await (new QueryBuilder(this._parent))
      [relationType](this.$variable, this._relationName)
      .node(model.$variable, model.$label)
      .where(c => {
        return c.where(`$id(${this._parent.$variable})`, this._parent.$primaryKey)
        .and(`$id(${model.$variable})`, model.$primaryKey)
      })
      .forceDelete('$' + this.$variable)
      .fetch()
  }

  async load() {
    const model = new this._attachedTo
    const relationType = this._isReverse ? 'relationIn' : 'relationOut'

    return await (new QueryBuilder(model))
      .match(c => {
        return c.node(this._parent.$variable, this._parent.$label)
          [relationType](this.$variable, this._relationName)
          .node(model.$variable, model.$label)
      })
      .where(`$id(${this._parent.$variable})`, this._parent.$primaryKey)
      .return('$' + model.$variable, `$${this.$variable} as __relationProperty`)
      .fetch()
  }

  async update(model, data = {}) {
    if (!this._isLinkingCorrectModel(model)) {
      throw "can't attach to the wrong model"
    }

    if (this._parent._timestamps) {
      data['updated_at'] = moment().format(DATE_FORMAT)
    }

    const relationType = this._isReverse ? 'relationIn' : 'relationOut'

    return await (new QueryBuilder(this))
      .match(m => {
        return m.node(this._parent.$variable, this._parent.$label)
          [relationType](this.$variable, this._relationName)
          .node(model.$variable, model.$label)
       })
      .where(c => {
        return c.where(`$id(${this._parent.$variable})`, this._parent.$primaryKey)
        .and(`$id(${model.$variable})`, model.$primaryKey)
      })
      .set('$' + this.$variable, data)
      .return('$' + this.$variable)
      .first()
  }

  async attach(model, data = {}) {
    if (!this._isLinkingCorrectModel(model)) {
      throw "can't attach to the wrong model"
    }

    if (this._parent._timestamps) {
      data['created_at'] = moment().format(DATE_FORMAT)
      data['updated_at'] = moment().format(DATE_FORMAT)
    }

    const relationType = this._isReverse ? 'relationIn' : 'relationOut'

    return await (new QueryBuilder(this))
      .match([
        c => c.node(this._parent.$variable, this._parent.$label),
        c => c.node(model.$variable, model.$label)
       ])
      .where(c => {
        return c.where(`$id(${this._parent.$variable})`, this._parent.$primaryKey)
        .and(`$id(${model.$variable})`, model.$primaryKey)
      })
      .create(m => {
        return m.node(this._parent.$variable)
          [relationType](this.$variable, this._relationName, data)
          .node(model.$variable)
       })
      .return('$' + this.$variable)
      .first()
  }
}

module.exports = BaseRelation
