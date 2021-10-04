'use strict'

const test = require('japa')

const Person = require("../data/Models/Person")
const Collection = require("../../src/Collection")
const _ = require("lodash")

test.group('Model Static Methods', (group) => {

	test('create', async (assert) => {
		let person = await Person.create({
			name: "Zorx"
		})

		assert.instanceOf(person, Person)

		assert.equal(person.name, "Zorx")
		assert.exists(person._id)
	})

	test('softdelete | restore | withTrashed | forceDelete', async (assert) => {
		let person = await Person.create({
			name: "Zorx"
		})

		let personId = person._id

		// softDelete
		await person.delete()

		person = await Person.find(personId)
		assert.isUndefined(person)

		// withTrashed
		person = await Person.query().withTrashed().whereId(personId).return().first()
		assert.exists(person)

		// Restore
		await person.restore()

		person = await Person.find(personId)
		assert.exists(person)

		await person.forceDelete()

		person = await Person.find(personId)
		assert.isUndefined(person)

		// person = await Person.withTrashed().find(personId)
		person = await Person.query().withTrashed().whereId(personId).return().first()
		assert.isUndefined(person)
	})

	test('add timestamps if enabled', async (assert) => {
		let person = await Person.create({
			name: "Zorx"
		})

		assert.instanceOf(person, Person)

		assert.equal(person.name, "Zorx")
		assert.exists(person.created_at)
		assert.exists(person.updated_at)
	})

	test('createMany', async (assert) => {
		let people = await Person.createMany([
			{
				name: "Zorx"
			}, {
				name: "Leeto"
			}
		])

		assert.instanceOf(people, Collection)

		let data = people.toJson()

		assert.equal(data[0].name, "Zorx")
		assert.exists(data[0]._id)

		assert.equal(data[1].name, "Leeto")
		assert.exists(data[1]._id)
	})

// 	test('single label', async (assert) => {
// 		Person.label("Actor")
// 	})

// 	test('multipe labels', async (assert) => {
// 		Person.label(["Actor", "Director"])
// 	})

	test('all', async (assert) => {
		let people = await Person.all();

		assert.instanceOf(people, Collection)
		assert.instanceOf(people.first(), Person)
	})

	test('first', async (assert) => {
		let person = await Person.first();

		assert.instanceOf(person, Person)
		assert.isNotNull(person.name)
	})

	test('last', async (assert) => {
		let person = await Person.last();

		assert.instanceOf(person, Person)
		assert.isNotNull(person.name)
	})

	test('find', async (assert) => {
		let first = await Person.first();
		let person = await Person.find(first._id);

		assert.instanceOf(person, Person)
		assert.equal(person.name, first.name)
		assert.equal(person._id, first._id)
	})

	test('findOrFail', async (assert) => {
		await Person.create({
			name: "Zorx"
		})

		let first = await Person.first();
		let person = await Person.findOrFail(first._id);

		assert.instanceOf(person, Person)
		assert.equal(person.name, first.name)
		assert.equal(person._id, first._id)


		try {
			await Person.findOrFail(1000);
		}catch(e) {
			console.log(e)
			assert.equal(e, "Cannot find node for 1000 model")
		}
	})

	test('update', async (assert) => {
		let people = await Person.update({
			firstname: "Lee"
		})

		assert.instanceOf(people, Collection)

		let lastPerson = await Person.last();
		assert.equal(lastPerson.firstname, "Lee")
		assert.exists(lastPerson.created_at)
	})

	test('count', async (assert) => {
		let all = await Person.all();
		let count = await Person.count();

		assert.isNumber(count);
		assert.equal(all.count(), count);
	})

	test('single destroy', async (assert) => {
		let person = await Person.first();
		await Person.destroy(person._id)

		person = await Person.find(person._id);
		assert.isUndefined(person)
	})

	test('multiple destroy', async (assert) => {
		let firstPerson = await Person.first();
		let lastPerson = await Person.last();

		await Person.destroy([firstPerson._id, lastPerson._id])

		firstPerson = await Person.find(firstPerson._id);
		assert.isUndefined(firstPerson)

		lastPerson = await Person.find(lastPerson._id);
		assert.isUndefined(lastPerson)
	})

	test('truncate', async (assert) => {
		let person = await Person.truncate();
		let count = await Person.count();

		assert.equal(count, 0)

		person = await Person.first();

		assert.isUndefined(person)
	})

	test('forceTruncate', async (assert) => {
		let person = await Person.forceTruncate();
		let count = await Person.count();

		assert.equal(count, 0)

		person = await Person.first();

		assert.isUndefined(person)
	})

	test('change the variable with "as()"', async (assert) => {
		let person = await Person.create({
			name: "Zorx"
		})

		let people = await Person.as('p').query().where('p.name', 'Zorx').return('p').fetch();

		assert.instanceOf(people, Collection)

		let data = people.toJson()

		assert.equal(data[0].name, "Zorx")
		assert.exists(data[0]._id)
	})

	test('query', async (assert) => {
		let person = await Person.create({
			name: "Zorx"
		})

		let people = await Person.query().where('name', 'Zorx').return().fetch();

		assert.instanceOf(people, Collection)

		let data = people.toJson()

		assert.equal(data[0].name, "Zorx")
		assert.exists(data[0]._id)

		let randomName = 'zorx_' + _.random(1, 100000)

		let randomPerson = await Person.create({
			name: randomName
		})

		let p = await Person.find(randomPerson._id)
		assert.exists(p)

    await Person.query().where('name', randomName).delete().fetch()

		assert.isUndefined(await Person.find(randomPerson._id))
	})
})

test.group('Model Instance Methods', (group) => {

	test('update an instance', async (assert) => {
		let person = await Person.create({
			name: "Zorx"
		})

		person = await person.update({
			name: 'Leeto'
		})

		assert.instanceOf(person, Person)
		assert.equal(person.name, "Leeto")
		assert.exists(person.created_at)
	})

	test('fill', async (assert) => {
		let person = new Person;

		person.fill({
			name: "Zorx"
		})

		assert.isFalse(person.isPersisted)

		person = await person.save()

		assert.isTrue(person.isPersisted)
		assert.instanceOf(person, Person)
		assert.equal(person.name, "Zorx")

		let newInstance = await Person.find(person._id)

		assert.instanceOf(newInstance, Person)
		assert.equal(newInstance.name, "Zorx")
	})

	test('instantiate and save', async (assert) => {
		let person = new Person;

		person.name = "Zorx"

		assert.isFalse(person.isPersisted)

		await person.save()

		assert.isTrue(person.isPersisted)
		assert.instanceOf(person, Person)
		assert.equal(person.name, "Zorx")

		assert.exists(person._id)
	})

	test('change and save', async (assert) => {
		let person = await Person.create({
			name: "Zorx"
		})

		let id = person._id;

		person.name = "Amine"

		assert.isFalse(person.isPersisted)

		person = await person.save()

		assert.isTrue(person.isPersisted)
		assert.instanceOf(person, Person)
		assert.equal(person.name, "Amine")
		assert.equal(id, person._id)
	})

	test('delete', async (assert) => {
		let person = await Person.create({
			name: "Zorx"
		})

		await person.delete()

		assert.isTrue(person.isDeleted)
		assert.isNumber(person._id)

		try {
			person.name = "my name"
		}catch(e) {
			assert.equal(e, "You can't set any properties to a deleted instance")
		}

		person = await Person.find(person._id)
		assert.isUndefined(person)
	})
})
