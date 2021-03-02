'use strict'

const { Model } = require("../../../src")
const Role = require("./Role")

class User extends Model {
  _labels = ['User']
  _softDeletes = true
  _timestamps = true

  role() {
     return this.relatedToOne(Role, "IS")
  }

  notRole() {
     return this.relatedToOne(Role, "IS_NOT")
  }
}

module.exports = User
