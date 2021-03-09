'use strict'

const test = require('japa')

const User = require("../data/Models/User");
const Role = require("../data/Models/Role");
const Person = require("../data/Models/Person");
const Movie = require("../data/Models/Movie");

const Collection = require("../../src/Collection")
const { RelatedToOne } = require("../../src/Relations")

test.group('Relations | RelatedToOne', (group) => {
  group.afterEach(async () => {
    await User.query().withTrashed().forceDelete().fetch()
    await Role.query().withTrashed().forceDelete().fetch()
  })

  test('attach', async (assert) => {
    let user = await User.create({
      name: "user"
    })

    let role = await Role.create({
      name: "admin"
    })

    let relation = await user.role().attach(role)

    assert.instanceOf(relation, RelatedToOne);
  })

  test("can't attach wrong model", async (assert) => {
    let user = await User.create({
      name: "user"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    try {
      await user.role().attach(movie)
    }catch(e) {
      await assert.equal(e, "can't attach to the wrong model");
    }

  })

  test('attach with properties', async (assert) => {
    let user = await User.create({
      name: "user"
    })

    let role = await Role.create({
      name: "admin"
    })

    let relation = await user.role().attach(role, {'since': 1999})

    assert.instanceOf(relation, RelatedToOne);
    assert.equal(relation.since, 1999)
  })

  test('update relation properties', async (assert) => {
    let user = await User.create({
      name: "user"
    })

    let role = await Role.create({
      name: "admin"
    })

    let relation = await user.role().attach(role, {'since': 1999})

    assert.instanceOf(relation, RelatedToOne);
    assert.equal(relation.since, 1999)

    relation = await user.role().update(role, {'since': 2000})

    assert.instanceOf(relation, RelatedToOne);
    assert.equal(relation.since, 2000)
  })

  test('get relation properties', async (assert) => {
    let user = await User.create({
      name: "user"
    })

    let role = await Role.create({
      name: "admin"
    })

    let relation = await user.role().attach(role, {'since': 1999})

    // Without eager loading
    user = await User.first()
    role = await user.role().load()

    let properties = role.getRelationProperties()
    assert.equal(properties.since, 1999)

    // Lazy eager loading
    user = await User.first()
    role = await user.load('role')
    properties = role.getRelationProperties()
    assert.equal(properties.since, 1999)

    // Eager loading
    user = await User.query()
      .withRelation('role')
      .return()
      .first()

    role = user.getRelated('role');
    properties = role.getRelationProperties()
    assert.equal(properties.since, 1999)

    // Multiple toJson
    let users = await User.query()
      .withRelation('role')
      .return()
      .fetch()

    users = users.toJson()
    properties = users[0].role.__relationProperties
    assert.equal(properties.since, 1999)

    // One toJson
    user = await User.query()
      .withRelation('role')
      .return()
      .first()

    user = user.toJson()
    properties = user.role.__relationProperties
    assert.equal(properties.since, 1999)
  })

  test('load without eager loading', async (assert) => {
    let user = await User.create({
      name: "user"
    })

    let role = await Role.create({
      name: "admin"
    })

    await user.role().attach(role, {'since': 1999})

    role = await user.role().load()
    assert.instanceOf(role, Role);
  })

  test('lazy eager loading', async (assert) => {
    let user = await User.create({
      name: "user"
    })

    let role = await Role.create({
      name: "admin"
    })

    await user.role().attach(role, {'since': 1999})

    let relatedRole = await user.load('role')
    assert.instanceOf(relatedRole, Role);

    relatedRole = user.getRelated('role')
    assert.instanceOf(relatedRole, Role);
  })

  test('eager loading | withRelation', async (assert) => {

    let user = await User.create({
      name: "user"
    })

    let role = await Role.create({
      name: "admin"
    })

    await user.role().attach(role, {'since': 1999})

    let users = await User
      .query()
      .withRelation('role')
      .return()
      .fetch()


    assert.instanceOf(users, Collection);

    assert.equal(users.count(), 1);
    assert.instanceOf(users.first(), User);
    assert.exists(users.first().getRelated('role'));

    const relatedRole = users.first().getRelated('role')
    assert.instanceOf(relatedRole, Role);

    users = users.toJson()

    assert.exists(users[0].role);
    assert.exists(users[0].role);
    assert.equal(users[0].role.name, 'admin');
  })

  test('eager loading | withRelation filter related', async (assert) => {
    let user1 = await User.create({
      name: "user1"
    })

    let user2 = await User.create({
      name: "user2"
    })

    let role1 = await Role.create({
      name: "admin"
    })

    let role2 = await Role.create({
      name: "manager"
    })

    await user1.role().attach(role1, {'since': 1999})
    await user2.role().attach(role2, {'since': 2000})

    let users = await User
      .query()
      .withRelation('role', c => c.where('name', 'admin'))
      .return()
      .fetch()

    assert.instanceOf(users, Collection);

    assert.equal(users.count(), 1);
    assert.instanceOf(users.first(), User);
    assert.exists(users.first().getRelated('role'));

    let role = users.first().getRelated('role')
    assert.instanceOf(role, Role);
    assert.equal(role.name, 'admin');

    users = users.toJson()

    assert.exists(users[0].role);
    assert.exists(users[0].role);
    assert.equal(users[0].role.name, 'admin');
  })

  test('eager loading | withRelation filter parent', async (assert) => {
    let user1 = await User.create({
      name: "user1"
    })

    let user2 = await User.create({
      name: "user2"
    })

    let role1 = await Role.create({
      name: "admin"
    })

    let role2 = await Role.create({
      name: "manager"
    })

    await user1.role().attach(role1, {'since': 1999})
    await user2.role().attach(role2, {'since': 2000})

    let users = await User
      .query()
      .where('name', 'user2')
      .withRelation('role')
      .return()
      .fetch()

    assert.instanceOf(users, Collection);

    assert.equal(users.count(), 1);
    assert.instanceOf(users.first(), User);
    assert.equal(users.first().name, "user2");

    assert.exists(users.first().getRelated('role'));

    let role = users.first().getRelated('role')
    assert.instanceOf(role, Role);
    assert.equal(role.name, "manager");
  })

  test('eager loading | multiple withRelation', async (assert) => {

    let user = await User.create({
      name: "user"
    })

    let role1 = await Role.create({
      name: "admin"
    })

    let role2 = await Role.create({
      name: "root"
    })

    await user.role().attach(role1)
    await user.notRole().attach(role2)

    let users = await User
      .query()
      .withRelation('role')
      .withRelation('notRole')
      .return()
      .fetch()

    assert.instanceOf(users, Collection);

    assert.instanceOf(users.first(), User);
    assert.exists(users.first().getRelated('role'));
    assert.exists(users.first().getRelated('notRole'));

    users = users.toJson()

    assert.exists(users[0].role);
    assert.equal(users[0].role.name, 'admin');

    assert.exists(users[0].notRole);
    assert.equal(users[0].notRole.name, 'root');
  })

  test('detach', async (assert) => {
    let user = await User.create({
      name: "user"
    })

    let role = await Role.create({
      name: "admin"
    })

    await user.role().attach(role)

    let loadedRole = await user.role().load()
    assert.instanceOf(loadedRole, Role);

    await user.role().detach(role)

    loadedRole = await user.role().load()
    assert.isUndefined(loadedRole);
  })
});
/**

== Without Eager Loading ==

const user = await User.find(1)
const posts = await user.posts().fetch()


== Lazy Eager Loading ==

const user = await User.find(1)
await user.load('posts')

const posts = user.getRelated('posts')

== Eager Loading ==

const User = use('App/Models/User')

const users = await User
  .query()
  .with('posts')
  .fetch()

const posts = user.getRelated('posts')
 */
