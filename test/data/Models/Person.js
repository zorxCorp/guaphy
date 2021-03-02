'use strict'

const { Model } = require("../../../src")
const Movie = require("./Movie")

class Person extends Model {
  _labels = ['Person']
  _softDeletes = true
  _timestamps = true

  actedInMovies() {
     return this.relatedToMany(Movie, "ACTED_IN")
  }

  directedMovies() {
     return this.relatedToMany(Movie, "DIRECTED")
  }
}

module.exports = Person
