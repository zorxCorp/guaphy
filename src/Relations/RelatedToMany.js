'use strict'

const BaseRelation = require('./BaseRelation')
const Collection   = require("../Collection")
const QueryBuilder = require("../QueryBuilder")
const _            = require('lodash')

class RelatedToMany extends BaseRelation {
  async attachMany(models, data = []) {
    if (!_.isArray(models)) {
      throw "first argument must be a valid models array"
    }

    let result = []

    for(let i = 0; i < models.length; i++) {
      result.push(await this.attach(models[i], _.get(data, i, {})))
    }

    return new Collection(result)
  }
}

module.exports = RelatedToMany
