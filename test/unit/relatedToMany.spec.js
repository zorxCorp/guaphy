'use strict'

const test = require('japa')

const User = require("../data/Models/User");
const Role = require("../data/Models/Role");
const Person = require("../data/Models/Person");
const Movie = require("../data/Models/Movie");
const Ioc = require("../../src/Utils/Ioc")

const Collection = require("../../src/Collection")
const { RelatedToMany, RelatedToOne } = require("../../src/Relations")

// Bind relations

Ioc.bind('Models/User', User)
Ioc.bind('Models/Role', Role)
Ioc.bind('Models/Person', Person)
Ioc.bind('Models/Movie', Movie)

test.group('Relations | RelatedToMany', (group) => {
  group.afterEach(async () => {
    await Person.query().withTrashed().forceDelete().fetch()
    await Movie.query().withTrashed().forceDelete().fetch()
  })

  test('attach', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    let relation = await person.actedInMovies().attach(movie)

    assert.instanceOf(relation, RelatedToMany);
  })

  test('attachMany', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    let movie2 = await Movie.create({
      name: "The Equalizer2"
    })

    let relations = await person.actedInMovies().attachMany([movie, movie2])

    assert.instanceOf(relations, Collection);
    assert.instanceOf(relations.first(), RelatedToMany);
  })

  test("can't attach wrong model", async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let user = await User.create({
      name: "Admin"
    })

    try {
      await person.actedInMovies().attach(user)
    }catch(e) {
      await assert.equal(e, "can't attach to the wrong model");
    }

  })

  test('attach with properties', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    let relation = await person.actedInMovies().attach(movie, {name: 'Robert McCall'})

    assert.instanceOf(relation, RelatedToMany);
    assert.equal(relation.name, 'Robert McCall')
  })

  test('update relation properties', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    let relation = await person.actedInMovies().attach(movie, {name: 'Robert McCall'})

    assert.instanceOf(relation, RelatedToMany);
    assert.equal(relation.name, 'Robert McCall')

    relation = await person.actedInMovies().update(movie, {name: 'Robert'})

    assert.instanceOf(relation, RelatedToMany);
    assert.equal(relation.name, 'Robert')
  })

  test('get relation properties', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    let relation = await person.actedInMovies().attach(movie, {name: 'Robert McCall'})

    // Without eager loading
    person = await Person.first()
    let movies = await person.actedInMovies().load()

    let properties = movies.first().getRelationProperties()
    assert.equal(properties.name, 'Robert McCall')

    // Lazy eager loading
    person = await Person.first()
    movies = await person.load('actedInMovies')
    properties = movies.first().getRelationProperties()
    assert.equal(properties.name, 'Robert McCall')

    // Eager loading
    person = await Person.query()
      .withRelation('actedInMovies')
      .return()
      .first()

    movies = person.getRelated('actedInMovies');
    properties = movies.first().getRelationProperties()
    assert.equal(properties.name, 'Robert McCall')

    // Multiple toJson
    let people = await Person.query()
      .withRelation('actedInMovies')
      .return()
      .fetch()

    people = people.toJson()
    properties = people[0].actedInMovies[0].__relationProperties
    assert.equal(properties.name, 'Robert McCall')

    // One toJson
    person = await Person.query()
      .withRelation('actedInMovies')
      .return()
      .first()

    person = person.toJson()
    properties = person.actedInMovies[0].__relationProperties
    assert.equal(properties.name, 'Robert McCall')
  })

  test('load without eager loading', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    await person.actedInMovies().attach(movie)

    let movies = await person.actedInMovies().load()
    assert.instanceOf(movies, Collection);

    let firstMovie = movies.first()
    assert.instanceOf(firstMovie, Movie);
  })

  test('lazy eager loading', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    await person.actedInMovies().attach(movie)

    let relatedMovies = await person.load('actedInMovies')
    assert.instanceOf(relatedMovies, Collection);

    let firstRelatedMovie = relatedMovies.first()
    assert.instanceOf(firstRelatedMovie, Movie);

    const movies = person.getRelated('actedInMovies')
    assert.instanceOf(movies, Collection);

    let firstMovie = movies.first()
    assert.instanceOf(firstMovie, Movie);
  })

  test('can use ioc', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    try {
      await movie.actors().attach(person)
    }catch(e) {
      await assert.notEqual(e, "can't attach to the wrong model");
    }
  })

  test('reverse relation', async (assert) => {

    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    await person.actedInMovies().attach(movie)

    movie = await Movie.first()
    let relatedActors = await movie.load('actors')

    assert.instanceOf(relatedActors, Collection);

    let relatedActor = relatedActors.first()
    assert.instanceOf(relatedActor, Person);

    let actors = movie.getRelated('actors')
    assert.instanceOf(actors, Collection);

    let actor = actors.first()
    assert.instanceOf(actor, Person);
    assert.equal(actor.name, 'Denzel Washington')
  })

  test('eager loading | withCountRelation with empty relations', async (assert) => {

    let person = await Person.create({
      name: "Denzel Washington"
    })

    let people = await Person
      .query()
      .withCountRelation('actedInMovies')
      .return()
      .fetch()


    assert.instanceOf(people, Collection);

    assert.equal(people.count(), 1);
    assert.instanceOf(people.first(), Person);
    assert.exists(people.first().getRelated('actedInMoviesCount'));

    const countMovies = people.first().getRelated('actedInMoviesCount')
    assert.equal(countMovies, 0);
  })

  test('eager loading | withCountRelation', async (assert) => {

    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie1 = await Movie.create({
      name: "The Equalizer"
    })

    let movie2 = await Movie.create({
      name: "The Equalizer2"
    })

    await person.actedInMovies().attach(movie1)
    await person.actedInMovies().attach(movie2)

    let people = await Person
      .query()
      .withCountRelation('actedInMovies')
      .return()
      .fetch()


    assert.instanceOf(people, Collection);

    assert.equal(people.count(), 1);
    assert.instanceOf(people.first(), Person);
    assert.exists(people.first().getRelated('actedInMoviesCount'));

    const countMovies = people.first().getRelated('actedInMoviesCount')
    assert.equal(countMovies, 2);
  })

  test('eager loading | withRelation', async (assert) => {

    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie1 = await Movie.create({
      name: "The Equalizer"
    })

    let movie2 = await Movie.create({
      name: "The Equalizer2"
    })

    await person.actedInMovies().attach(movie1)
    await person.actedInMovies().attach(movie2)

    let people = await Person
      .query()
      .withRelation('actedInMovies')
      .return()
      .fetch()


    assert.instanceOf(people, Collection);

    assert.equal(people.count(), 1);
    assert.instanceOf(people.first(), Person);
    assert.exists(people.first().getRelated('actedInMovies'));

    const movies = people.first().getRelated('actedInMovies')
    assert.instanceOf(movies, Collection);
    assert.equal(movies.count(), 2);

    let firstMovie = movies.first()
    assert.instanceOf(firstMovie, Movie);

    people = people.toJson()

    assert.exists(people[0].actedInMovies);
    assert.exists(people[0].actedInMovies[0]);
    assert.exists(people[0].actedInMovies[0].name);
  })

  test('eager loading | withRelation limit', async (assert) => {

    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie1 = await Movie.create({
      name: "The Equalizer"
    })

    let movie2 = await Movie.create({
      name: "The Equalizer2"
    })

    await person.actedInMovies().attach(movie1)
    await person.actedInMovies().attach(movie2)

    let people = await Person
      .query()
      .withRelation('actedInMovies', 1)
      .return()
      .fetch()


    assert.instanceOf(people, Collection);

    assert.equal(people.count(), 1);
    assert.instanceOf(people.first(), Person);
    assert.exists(people.first().getRelated('actedInMovies'));

    const movies = people.first().getRelated('actedInMovies')
    assert.instanceOf(movies, Collection);
    assert.equal(movies.count(), 1);

    let firstMovie = movies.first()
    assert.instanceOf(firstMovie, Movie);

    people = people.toJson()

    assert.exists(people[0].actedInMovies);
    assert.exists(people[0].actedInMovies[0]);
    assert.exists(people[0].actedInMovies[0].name);
  })

  test('eager loading | withRelation filter related', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let person2 = await Person.create({
      name: "Keanu Reeves"
    })

    let movie1 = await Movie.create({
      name: "The Equalizer"
    })

    let movie2 = await Movie.create({
      name: "The Equalizer2"
    })

    let movie3 = await Movie.create({
      name: "John Wick"
    })

    await person.actedInMovies().attach(movie1)
    await person.actedInMovies().attach(movie2)
    await person2.actedInMovies().attach(movie3)

    let people = await Person
      .query()
      .withRelation('actedInMovies', c => c.where('name', 'The Equalizer'))
      .return()
      .fetch()

    assert.instanceOf(people, Collection);

    assert.equal(people.count(), 2);
    assert.instanceOf(people.first(), Person);
    assert.exists(people.first().getRelated('actedInMovies'));

    const movies = people.first().getRelated('actedInMovies')
    assert.instanceOf(movies, Collection);
    assert.equal(movies.count(), 1);

    let firstMovie = movies.first()
    assert.instanceOf(firstMovie, Movie);
    assert.equal(firstMovie.name, 'The Equalizer');

    people = people.toJson()

    assert.exists(people[0].actedInMovies);
    assert.exists(people[0].actedInMovies[0]);
    assert.equal(people[0].actedInMovies[0].name, 'The Equalizer');
  })

  test('eager loading | withRelation filter related and limit', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let person2 = await Person.create({
      name: "Keanu Reeves"
    })

    let movie1 = await Movie.create({
      name: "The Equalizer"
    })

    let movie2 = await Movie.create({
      name: "The Equalizer2"
    })

    let movie3 = await Movie.create({
      name: "John Wick"
    })

    await person.actedInMovies().attach(movie1)
    await person.actedInMovies().attach(movie2)
    await person2.actedInMovies().attach(movie3)

    let people = await Person
      .query()
      .withRelation('actedInMovies', c => c.where('name', 'The Equalizer'), 1)
      .return()
      .fetch()

    assert.instanceOf(people, Collection);

    assert.equal(people.count(), 2);
    assert.instanceOf(people.first(), Person);
    assert.exists(people.first().getRelated('actedInMovies'));

    const movies = people.first().getRelated('actedInMovies')
    assert.instanceOf(movies, Collection);
    assert.equal(movies.count(), 1);

    let firstMovie = movies.first()
    assert.instanceOf(firstMovie, Movie);
    assert.equal(firstMovie.name, 'The Equalizer');

    people = people.toJson()

    assert.exists(people[0].actedInMovies);
    assert.exists(people[0].actedInMovies[0]);
    assert.equal(people[0].actedInMovies[0].name, 'The Equalizer');
  })

  test('eager loading | withRelation filter parent', async (assert) => {
    let person1 = await Person.create({
      name: "Denzel Washington"
    })

    let person2 = await Person.create({
      name: "Keanu Reeves"
    })

    let movieP1 = await Movie.create({
      name: "The Equalizer"
    })

    let movieP2 = await Movie.create({
      name: "John Wick"
    })

    await person1.actedInMovies().attach(movieP1)
    await person2.actedInMovies().attach(movieP2)

    let people = await Person
      .query()
      .where('name', 'Keanu Reeves')
      .withRelation('actedInMovies')
      .return()
      .fetch()

    assert.instanceOf(people, Collection);

    assert.equal(people.count(), 1);
    assert.instanceOf(people.first(), Person);
    assert.equal(people.first().name, "Keanu Reeves");

    assert.exists(people.first().getRelated('actedInMovies'));

    const movies = people.first().getRelated('actedInMovies')
    assert.instanceOf(movies, Collection);
    assert.equal(movies.count(), 1);

    let firstMovie = movies.first()
    assert.instanceOf(firstMovie, Movie);
    assert.equal(firstMovie.name, "John Wick");
  })

  test('eager loading | multiple withRelation', async (assert) => {

    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    let directedMovie = await Movie.create({
      name: "Fences"
    })

    await person.actedInMovies().attach(movie)
    await person.directedMovies().attach(directedMovie)

    let people = await Person
      .query()
      .withRelation('actedInMovies')
      .withRelation('directedMovies')
      .return()
      .fetch()

    assert.instanceOf(people, Collection);

    assert.instanceOf(people.first(), Person);
    assert.exists(people.first().getRelated('actedInMovies'));
    assert.exists(people.first().getRelated('directedMovies'));

    people = people.toJson()

    assert.exists(people[0].actedInMovies);
    assert.exists(people[0].actedInMovies[0]);
    assert.equal(people[0].actedInMovies[0].name, 'The Equalizer');

    assert.exists(people[0].directedMovies);
    assert.exists(people[0].directedMovies[0]);
    assert.equal(people[0].directedMovies[0].name, 'Fences');
  })

  test('exists', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    let movie2 = await Movie.create({
      name: "The Equalizer2"
    })

    await person.actedInMovies().attach(movie)

    let result = await person.actedInMovies().exists(movie);
    let result2 = await person.actedInMovies().exists(movie2);

    assert.isTrue(result)
    assert.isFalse(result2)
  });

  test('detach', async (assert) => {
    let person = await Person.create({
      name: "Denzel Washington"
    })

    let movie = await Movie.create({
      name: "The Equalizer"
    })

    await person.actedInMovies().attach(movie)

    let firstMovie = (await person.actedInMovies().load()).first()
    assert.instanceOf(firstMovie, Movie);

    await person.actedInMovies().detach(movie)

    firstMovie = (await person.actedInMovies().load()).first()
    assert.isUndefined(firstMovie);
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
