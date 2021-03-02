'use strict'

const BaseRelation = require('./BaseRelation')

class RelatedToOne extends BaseRelation {
  async load() {
    return (await super.load()).first()
  }
}

module.exports = RelatedToOne
