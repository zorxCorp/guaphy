'use strict'

const { Model } = require("../../../src")

class Movie extends Model {
  _labels = ['Movie']
  _softDeletes = true
  _timestamps = true

  actors() {
     return this.relatedToMany('Models/Person', "ACTED_IN", true)
  }

  directors() {
     return this.relatedToMany('Models/Person', "DIRECTED", true)
  }
}

module.exports = Movie
