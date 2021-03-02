'use strict'

const QueryBuilder = require("../../../src/QueryBuilder")

class Helper {
  static async createData() {
    return await QueryBuilder.raw('CREATE (a:Person {name: "Zorx"}) RETURN a');
  }

  static async dropData() {

  }

  static async closeDatabase() {
    // await driver.close()
  }
}

module.exports = Helper
