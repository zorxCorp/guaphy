'use strict'

const test = require('japa')

const Ioc = require("../../src/Utils/Ioc")
const Person = require("../data/Models/Person");

test.group('Ioc', (group) => {

	test('bind', async (assert) => {
		Ioc.bind('Models/Person', Person)

		const bindings = Ioc.getBindings()
		assert.exists(bindings['Models/Person'])
	})

	test('use', async (assert) => {
		Ioc.bind('Models/Person', Person)

		const personModel = Ioc.use('Models/Person')
		assert.instanceOf(new personModel, Person)
	})

	test('singleton instance', async (assert) => {
		Ioc.bind('Models/Person', Person)
		let anotherIoc = require("../../src/Utils/Ioc")

		const personModel = anotherIoc.use('Models/Person')
		assert.instanceOf(new personModel, Person)
	})
})
