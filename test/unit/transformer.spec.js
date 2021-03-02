'use strict'

const test = require('japa')

const Person = require("../data/Models/Person")
const Collection = require("../../src/Collection")
const { Transformer } = require("../../src/Utils")
const _ = require("lodash")
const neo4j =  require('neo4j-driver')

test.group('Transformer', (group) => {

	test('transformField', async (assert) => {
		let model = new Person

		assert.equal(Transformer.transformField('$name'), 'name')
		assert.equal(Transformer.transformField('$name', model), 'name')
		assert.equal(Transformer.transformField('name', model), `${model.$variable}.name`)
		assert.equal(Transformer.transformField(`${model.$variable}.name`, model), `${model.$variable}.name`)
		assert.isFunction(Transformer.transformField(function(){}))
		assert.isFunction(Transformer.transformField(function(){}, model))
	})

	test('transformVariable', async (assert) => {
		assert.equal(Transformer.transformVariable('11'), "'11'")
		assert.equal(Transformer.transformVariable(11), 11)
		assert.equal(Transformer.transformVariable('name'), "'name'")
		assert.equal(Transformer.transformVariable([1,2,3]), "[1,2,3]")
		assert.equal(Transformer.transformVariable({name: 'John'}), "{ name: 'John' }")
		assert.equal(Transformer.transformVariable(true), "true")
		assert.equal(Transformer.transformVariable(null), "null")
		assert.equal(Transformer.transformVariable('$name'), "name")
		assert.equal(Transformer.transformVariable('$11'), 11)
	})
})
