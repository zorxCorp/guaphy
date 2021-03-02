'use strict'

const { Model } = require("../../../src")

class Role extends Model {
  _labels = ['Role']
  _softDeletes = true
  _timestamps = true

  users() {
     return this.relatedToMany('Models/User', "CONTAIN")
  }
}

module.exports = Role
