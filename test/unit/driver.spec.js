'use strict'

const test = require('japa')

const { getConnection, getDriver } = require("../../src/Driver");

test('can get connection', (assert) => {
  assert.isNotNull(getConnection());
})

test('can get driver', (assert) => {
  assert.isNotNull(getDriver());
})
