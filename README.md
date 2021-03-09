# Guaphy

Guaphy is a javascript OGM for graph databases, Guaphy supports neo4j cypher language

---
- [How To Install](#how-to-install)
- [Model](#model-query-builder)
  - [Example Model](#example-model)
  - [Ioc](#ioc)
  - [Static Methods](#static-methods)
  - [Instance Methods](#instance-methods)
  - [Relationships](#relationships)
    - [RelatedToOne](#relatedtoone)
    - [RelatedToMany](#relatedtomany)
- [Query Builder](#cypher-query-builder)
  - [Conditions](#conditions)
  - [Clauses](#clauses)


---

# How To Install

` yarn add guaphy `

Default Env

```
NEO4J_PROTOCOL = 'bolt'
NEO4J_HOST = 'localhost'
NEO4J_PORT = '7687'
NEO4J_USER = 'neo4j'
NEO4J_PASSWORD = 'leeto'
NEO4J_ENTERPRISE='false'
NEO4J_DATABASE = 'neo4j'
```

Advanced Env

```
NEO4J_ENCRYPTION = 'encrypted'
NEO4J_TRUST = 'trust'
NEO4J_TRUSTED_CERTIFICATES = 'trustedCertificates'
NEO4J_KNOWN_HOSTS = 'knownHosts'
NEO4J_MAX_CONNECTION_POOLSIZE = 'maxConnectionPoolSize'
NEO4J_MAX_TRANSACTION_RETRY_TIME = 'maxTransactionRetryTime'
NEO4J_LOAD_BALANCING_STRATEGY = 'loadBalancingStrategy'
NEO4J_MAX_CONNECTION_LIFETIME = 'maxConnectionLifetime'
NEO4J_CONNECTION_TIMEOUT = 'connectionTimeout'
NEO4J_DISABLE_LOSSLESS_INTEGERS = 'disableLosslessIntegers'
NEO4J_LOGGING_LEVEL = 'logging'
```

# Model

## Example model

```
'use strict'

const { Model } = require("guaphy")
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
```

## Ioc

Ioc helps you to avoid circular dependencies of models, so you can register your models before using them.

```
// index.js
const Person = require("Models/Person")
const Movie = require("Models/Movie")
const { Ioc } = require("guaphy")

Ioc.bind('Models/Person', Person)
Ioc.bind('Models/Movie', Movie)
```

```
// Modes/Person.js

'use strict'

const { Model } = require("guaphy")

class Person extends Model {
  _labels = ['Person']
  _softDeletes = true
  _timestamps = true

  actedInMovies() {
     return this.relatedToMany('Models/Movie', "ACTED_IN")
  }

  directedMovies() {
     return this.relatedToMany('Models/Movie', "DIRECTED")
  }
}

module.exports = Person
```

## Static Methods

### create
You can pass data directly to the model on creation, instead of manually setting attributes after instantiation:

```
const Person = require("../data/Models/Person")

let person = await Person.create({ name: "Zorx" })
```

### createMany
Like create, you can pass data directly for multiple instances on creation:

```
const Person = require("../data/Models/Person")

let data = [{name: "Zorx"}, {name: "Leeto"}]
let people = await Person.createMany(data)
```

### all
Select all nodes:

```
const Person = require("../data/Models/Person")

const people = await Person.all()
```

### first
Find the first node from the database:

```
const Person = require("../data/Models/Person")

await Person.first()
```

### last
Find the last node from the database:

```
const Person = require("../data/Models/Person")

await Person.last()
```

### find
Find a record using the primary key (always returns one record):

```
const Person = require("../data/Models/Person")

await Person.find(1)
```

### count
Return a count of records in a given result set

```
const Person = require("../data/Models/Person")

let count = await Person.count()
```

### destroy
The destroy method deletes an existing model by its primary key

```
const Person = require("../data/Models/Person")

// Single destroy
let person = await Person.first();
await Person.destroy(person._id)
```

```
// Multiple destroy
let firstPerson = await Person.first();
let lastPerson = await Person.last();

await Person.destroy([firstPerson._id, lastPerson._id])
```

### truncate
Delete all nodes.

```
const Person = require("../data/Models/Person")

const people = await Person.truncate()
```

### forceTruncate

```
const Person = require("../data/Models/Person")

const people = await Person.forceTruncate()
```

### as
change the variable with "as" method

```
let person = await Person.create({ name: "Zorx" })
let people = await Person.as('p').query().where('p.name', 'Zorx').return('p').fetch();
```

### query

To obtain a Query Builder instance, call the model query method:

```
const Person = require("../data/Models/Person")

const adults = await Person
.query()
.where('name', 'Zorx')
.return().fetch();
```

The fetch method is required to execute the query ensuring results return

## Instance Methods

### update
Update an instance:

```
const Person = require("../data/Models/Person")

let person = await Person.find(1)
await person.update({ name: 'Leeto' })
```

### instantiate and save

### save
With models, instead of inserting raw values into the database,
you persist the model instance which in turn makes the insert query for you. For example:

```
let person = new Person;
person.name = "Zorx"

await person.save()
```

### change and save
```
let person = await Person.create({ name: "Zorx" })

person.name = "Leeto"

person = await person.save()
```

### delete (soft delete)
A single model instance can be deleted by calling the delete method:

```
const Person = require("../data/Models/Person")

let person = await Person.find(1)
await person.delete()
```

Delete method is a soft delete that means the deleted model instance,
can be restored by using restore method

### restore

Restore the deleted model instance

```
let deletedUerId = 1
let person = await Person.query().withTrashed().whereId(deletedUerId).return().first()

await person.restore()
```

### forceDelete

Unlike delete method the forceDelete method will delete the model instance immediately

```
const Person = require("../data/Models/Person")

let person = await Person.find(1)
await person.forceDelete()
```

### Bulk Deletes
Bulk deletes are performed with the help of Query Builder:

```
const Person = require("../data/Models/Person")

const adults = await Person
.query()
.where('name', 'Zorx')
.delete();
```

## Relationships

---

### RelatedToOne

#### attach

```
let user = await User.create({ name: "user" })

let role = await Role.create({ name: "admin" })

let relation = await user.role().attach(role)
```

#### attach with properties

```
let user = await User.create({ name: "user" })

let role = await Role.create({ name: "admin" })

let relation = await user.role().attach(role, {'since': 1999})
```

#### update relation properties

```
let user = await User.create({ name: "user" })
let role = await Role.create({ name: "admin" })

let relation = await user.role().attach(role, {'since': 1999})
relation = await user.role().update(role, {'since': 2000})
```


#### get relation properties

```
let user = await User.create({ name: "user" })
let role = await Role.create({ name: "admin" })

let relation = await user.role().attach(role, {'since': 1999})

// Without eager loading
user = await User.first()
role = await user.role().load()

let properties = role.getRelationProperties()

// Lazy eager loading
user = await User.first()
role = await user.load('role')
properties = role.getRelationProperties()

// Eager loading
user = await User.query()
  .withRelation('role')
  .return()
  .first()

role = user.getRelated('role');
properties = role.getRelationProperties()

// Multiple toJson
let users = await User.query()
  .withRelation('role')
  .return()
  .fetch()

users = users.toJson()
properties = users[0].role.__relationProperties

// One toJson
user = await User.query()
  .withRelation('role')
  .return()
  .first()

user = user.toJson()
properties = user.role.__relationProperties
```

#### load without eager loading

```
let user = await User.create({ name: "user" })
let role = await Role.create({ name: "admin" })

await user.role().attach(role, {'since': 1999})

role = await user.role().load()
```

#### lazy eager loading

```
let user = await User.create({ name: "user" })
let role = await Role.create({ name: "admin" })

await user.role().attach(role, {'since': 1999})

let relatedRole = await user.load('role')
relatedRole = user.getRelated('role')
```

#### eager loading | withRelation

```
let user = await User.create({ name: "user" })
let role = await Role.create({ name: "admin" })

await user.role().attach(role, {'since': 1999})

let users = await User
  .query()
  .withRelation('role')
  .return()
  .fetch()
```

#### eager loading | withRelation filter related

```
let user1 = await User.create({ name: "user1" })
let user2 = await User.create({ name: "user2" })
let role1 = await Role.create({ name: "admin" })
let role2 = await Role.create({ name: "manager" })

await user1.role().attach(role1, {'since': 1999})
await user2.role().attach(role2, {'since': 2000})

let users = await User
  .query()
  .withRelation('role', c => c.where('name', 'admin'))
  .return()
  .fetch()
```

#### eager loading | withRelation filter parent

```
let user1 = await User.create({ name: "user1" })
let user2 = await User.create({ name: "user2" })
let role1 = await Role.create({ name: "admin" })
let role2 = await Role.create({ name: "manager" })

await user1.role().attach(role1, {'since': 1999})
await user2.role().attach(role2, {'since': 2000})

let users = await User
  .query()
  .where('name', 'user2')
  .withRelation('role')
  .return()
  .fetch()
```

#### eager loading | multiple withRelation

```
let user = await User.create({ name: "user" })
let role1 = await Role.create({ name: "admin" })
let role2 = await Role.create({ name: "root" })

await user.role().attach(role1)
await user.notRole().attach(role2)

let users = await User
  .query()
  .withRelation('role')
  .withRelation('notRole')
  .return()
  .fetch()
```

#### detach

```
let user = await User.create({ name: "user" })
let role = await Role.create({ name: "admin" })

await user.role().attach(role)
await user.role().detach(role)
```

### RelatedToMany

#### attach

```
let person = await Person.create({ name: "Denzel Washington" })
let movie  = await Movie.create({ name: "The Equalizer" })

let relation = await person.actedInMovies().attach(movie)
```

#### attach with properties

```
let person = await Person.create({ name: "Denzel Washington" })
let movie  = await Movie.create({ name: "The Equalizer" })

let relation = await person.actedInMovies().attach(movie, {name: 'Robert McCall'})
```

#### update relation properties

```
let person = await Person.create({ name: "Denzel Washington" })
let movie  = await Movie.create({ name: "The Equalizer" })

relation = await person.actedInMovies().update(movie, {name: 'Robert'})
```

#### get relation properties

```
let person = await Person.create({ name: "Denzel Washington" })
let movie  = await Movie.create({ name: "The Equalizer" })

// Without eager loading
person = await Person.first()
let movies = await person.actedInMovies().load()

// Lazy eager loading
person = await Person.first()
movies = await person.load('actedInMovies')
properties = movies.first().getRelationProperties()

// Eager loading
person = await Person.query()
  .withRelation('actedInMovies')
  .return()
  .first()

movies = person.getRelated('actedInMovies');
properties = movies.first().getRelationProperties()

// Multiple toJson
let people = await Person.query()
  .withRelation('actedInMovies')
  .return()
  .fetch()

people = people.toJson()
properties = people[0].actedInMovies[0].__relationProperties

// One toJson
person = await Person.query()
  .withRelation('actedInMovies')
  .return()
  .first()

person = person.toJson()
properties = person.actedInMovies[0].__relationProperties
```

#### load without eager loading

```
let person = await Person.create({ name: "Denzel Washington" })
let movie  = await Movie.create({ name: "The Equalizer" })

await person.actedInMovies().attach(movie)

let movies = await person.actedInMovies().load()
```

#### lazy eager loading

```
let person = await Person.create({ name: "Denzel Washington" })
let movie  = await Movie.create({ name: "The Equalizer" })

await person.actedInMovies().attach(movie)

let relatedMovies = await person.load('actedInMovies')
```

#### reverse relation

```
let person = await Person.create({ name: "Denzel Washington" })
let movie  = await Movie.create({ name: "The Equalizer" })

await person.actedInMovies().attach(movie)

movie = await Movie.first()
let relatedActors = await movie.load('actors')
```


#### eager loading | withRelation

```
let person  = await Person.create({ name: "Denzel Washington" })
let movie1  = await Movie.create({ name: "The Equalizer" })
let movie2  = await Movie.create({ name: "The Equalizer2" })

await person.actedInMovies().attach(movie1)
await person.actedInMovies().attach(movie2)

let people = await Person
  .query()
  .withRelation('actedInMovies')
  .return()
  .fetch()

movie = await Movie.first()
let relatedActors = await movie.load('actors')
```

#### eager loading | withRelation filter related

```
let person  = await Person.create({ name: "Denzel Washington" })
let person2 = await Person.create({ name: "Keanu Reeves" })
let movie1  = await Movie.create({ name: "The Equalizer" })
let movie2  = await Movie.create({ name: "The Equalizer2" })
let movie3  = await Movie.create({ name: "John Wick" })

await person.actedInMovies().attach(movie1)
await person.actedInMovies().attach(movie2)
await person2.actedInMovies().attach(movie3)

let people = await Person
  .query()
  .withRelation('actedInMovies', c => c.where('name', 'The Equalizer'))
  .return()
  .fetch()
```

#### eager loading | withRelation filter parent

```
let person1 = await Person.create({ name: "Denzel Washington" })
let person2 = await Person.create({ name: "Keanu Reeves" })
let movie1  = await Movie.create({ name: "The Equalizer" })
let movie2  = await Movie.create({ name: "The Equalizer2" })

await person1.actedInMovies().attach(movieP1)
await person2.actedInMovies().attach(movieP2)

let people = await Person
  .query()
  .where('name', 'Keanu Reeves')
  .withRelation('actedInMovies')
  .return()
  .fetch()
```

#### eager loading | multiple withRelation

```
let person = await Person.create({ name: "Denzel Washington" })
let movie = await Movie.create({ name: "The Equalizer" })
let directedMovie = await Movie.create({ name: "Fences" })

await person.actedInMovies().attach(movie)
await person.directedMovies().attach(directedMovie)

let people = await Person
  .query()
  .withRelation('actedInMovies')
  .withRelation('directedMovies')
  .return()
  .fetch()
```

#### detach

```
let person = await Person.create({ name: "Denzel Washington" })
let movie  = await Movie.create({ name: "The Equalizer" })

await person.actedInMovies().attach(movie)
await person.actedInMovies().detach(movie)
```




---

# Cypher Query Builder

#### Require Query Builder

```
const QueryBuilder = require("../../src/QueryBuilder")
const queryBuilder = (new QueryBuilder)
```

### cypher
cypher method

```
let result = await queryBuilder
.cypher('CREATE (a:Person {name: "leeto"}), (b:User {name: "zorx"}) RETURN a,b')
.fetch()
```

## chain cypher methods

```
let result = await queryBuilder
.cypher('CREATE (a:Person {name: "leeto"}), (b:Person {name: "zorx"})')
.cypher('RETURN a,b')
```

### toCypher | toCYPHER
Returns cypher query to string

```
let query = 'CREATE (a:Person {name: "zorx"}) RETURN a';

let result1 = (new QueryBuilder).cypher(query).toCypher()
let result2 = (new QueryBuilder).cypher(query).toCYPHER()

// result1
// CREATE (a:Person {name: "zorx"}) RETURN a

// result2
// CREATE (a:Person {name: "zorx"}) RETURN a
```

### fetch
The fetch method is required to execute the query ensuring results return.

```
let result = await queryBuilder
.cypher('MATCH (n:Person) RETURN n')
.fetch()
```

### first
Return the first match record

```
let result = await queryBuilder
.cypher('MATCH (n:Person) RETURN n')
.first()
```

### count
Return a count of records in a given result set

```
let result = await queryBuilder.cypher('MATCH (n:Person) RETURN n').fetch()

let count = await result.count()
```

## Clauses

### limit
Limit the number of the results

```
let result = await queryBuilder
.cypher('MATCH (n:Person) RETURN n')
.limit(1)
.fetch()
```

### orderBy

The orderBy method can takes string, array and array of object

```
queryBuilder.orderBy('a.name') // equals to 'ORDER BY a.name')
```
```
queryBuilder.orderBy('a.name', 'DESC') // equals to 'ORDER BY a.name DESC')
```
```
queryBuilder.orderBy(['a.name', 'b.name']) // equals to 'ORDER BY a.name,b.name')
```
```
queryBuilder.orderBy(['a.name', 'b.name'], 'DESC') // equals to 'ORDER BY a.name DESC,b.name DESC')
```
```
queryBuilder.orderBy([{'a.name': 'DESC'}, 'b.name']) // equals to 'ORDER BY a.name DESC,b.name')
```
```
queryBuilder.orderBy([{'a.name': 'DESC'}, {'b.name': 'DESC'}]) // equals to 'ORDER BY a.name DESC,b.name DESC')
```
```
queryBuilder.orderBy([{'a.name': 'DESC', 'b.name': 'DESC'}]) // equals to 'ORDER BY a.name DESC,b.name DESC')
```
```
queryBuilder.orderBy(['a.name', {'b.name': 'DESC'}]) // equals to 'ORDER BY a.name,b.name DESC')
```

### return
The return method takes as many arguments as you need.

```
queryBuilder.return('a', 'b') // equals to RETURN a,b
```
```
queryBuilder.return('a', 'b', 'c') // equals to RETURN a,b,c
```

### node
The node method takes three arguments, the first is the field, the second is the label,
and the third is the params.

```
queryBuilder.node('') // equals to ()
```
```
queryBuilder.node('n') // equals to (n)
```
```
queryBuilder.node(null, 'Movie') // equals to (:Movie)
```
```
queryBuilder.node('movie', 'Movie') // equals to (movie:Movie)
```
```
queryBuilder.node('director', 'Movie', {name: 'Oliver Stone'}) // equals to (director:Movie { name: 'Oliver Stone' })
```
```
queryBuilder.node('director', {name: 'Oliver Stone'}) // equals to (director { name: 'Oliver Stone' })
```


### relation
The relation method takes three arguments, the first is the field, the second is the label,
and the third is the params.

```
queryBuilder.relation() // equals to  '--'
```
```
queryBuilder.relation('r') // equals to  '-[r]-'
```
```
queryBuilder.relation(null, 'ACTED_IN') // equals to  '-[:ACTED_IN]-'
```
```
queryBuilder.relation(':ACTED_IN') // equals to  '-[:ACTED_IN]-'
```
```
queryBuilder.relation('r', 'ACTED_IN') // equals to  '-[r:ACTED_IN]-'
```
```
queryBuilder.relation(
      r => { return r.relate(':ACTED_IN').relate(':DIRECTED')}
    )
// equals to  '-[:ACTED_IN|:DIRECTED]-'
```
```
queryBuilder.relation(
      r => {return r.relate('r', 'ACTED_IN').relate(':DIRECTED')}
    )
// equals to  '-[r:ACTED_IN|:DIRECTED]-'
```
```
queryBuilder.relation(
      r => {return r.relate('r', 'ACTED_IN').relate('d', 'DIRECTED')}
    )
// equals to  '-[r:ACTED_IN|d:DIRECTED]-'
```
```
queryBuilder.relation(
      r => {return r.relate(null, 'ACTED_IN').relate('d', 'DIRECTED')}
    )
// equals to  '-[:ACTED_IN|d:DIRECTED]-'
```
```
queryBuilder.relation(
      r => {return r.relate(null, 'ACTED_IN').relate('d', 'DIRECTED').relate('m', 'MANAGED')}
    )
// equals to  '-[:ACTED_IN|d:DIRECTED|m:MANAGED]-'
```

### relationIn
The relationIn method takes three arguments, the first is the field, the second is the label,
and the third is the params, for example:

```
queryBuilder.relationIn() // equals to '<--'
```
```
queryBuilder.relationIn('r') // equals to '<-[r]-'
```
```
queryBuilder.relationIn(null, 'ACTED_IN') // equals to '<-[:ACTED_IN]-'
```
```
queryBuilder.relationIn(':ACTED_IN') // equals to '<-[:ACTED_IN]-'
```
```
queryBuilder.relationIn('r', 'ACTED_IN') // equals to '<-[r:ACTED_IN]-'
```

```
queryBuilder.relationIn(
    r => {return r.relate(':ACTED_IN').relate(':DIRECTED')})

// equals to '<-[:ACTED_IN|:DIRECTED]-'
```
```
queryBuilder.relationIn(
    r => {return r.relate('r', 'ACTED_IN').relate(':DIRECTED')})

// equals to '<-[r:ACTED_IN|:DIRECTED]-'
```
```
queryBuilder.relationIn(
    r => {return r.relate('r', 'ACTED_IN').relate('d', 'DIRECTED')})

// equals to '<-[r:ACTED_IN|d:DIRECTED]-'
```
```
queryBuilder.relationIn(
    r => {return r.relate(null, 'ACTED_IN').relate('d', 'DIRECTED')})

// equals to '<-[:ACTED_IN|d:DIRECTED]-'
```
```
queryBuilder.relationIn(
    r => {return r.relate(null, 'ACTED_IN').relate('d', 'DIRECTED').relate('m', 'MANAGED')})

// equals to '<-[:ACTED_IN|d:DIRECTED|m:MANAGED]-'
```

### relationOut
Like the relationIn, but it's in the opposite direction, for example:

```
queryBuilder.relationOut() // equals to '-->'
```
```
queryBuilder.relationOut('r') // equals to '-[r]->'
```
```
queryBuilder.relationOut(null, 'ACTED_IN') // equals to '-[:ACTED_IN]->'
```
```
queryBuilder.relationOut(':ACTED_IN') // equals to '-[:ACTED_IN]->'
```
```
queryBuilder.relationOut('r', 'ACTED_IN') // equals to '-[r:ACTED_IN]->'
```
```
queryBuilder.relationOut('r', 'ACTED_IN', {role: 'Sophia'}) // equals to "-[r:ACTED_IN { role: 'Sophia' }]->"
```

```
queryBuilder.relationOut(
    r => {return r.relate(':ACTED_IN').relate(null, 'DIRECTED', {since: 1985})})

// equals to '-[:ACTED_IN|:DIRECTED { since: 1985 }]->'
```
```
queryBuilder.relationOut(
    r => {return r.relate('r', 'ACTED_IN').relate(':DIRECTED')})

// equals to '-[r:ACTED_IN|:DIRECTED]->'
```
```
queryBuilder.relationOut(
    r => {return r.relate('r', 'ACTED_IN').relate('d', 'DIRECTED')})

// equals to '-[r:ACTED_IN|d:DIRECTED]->'
```
```
queryBuilder.relationOut(
    r => {return r.relate(null, 'ACTED_IN').relate('d', 'DIRECTED')})

//  equals to '-[:ACTED_IN|d:DIRECTED]->'
```
```
queryBuilder.relationOut(
    r => {return r.relate(null, 'ACTED_IN').relate('d', 'DIRECTED').relate('m', 'MANAGED')})

// equals to '-[:ACTED_IN|d:DIRECTED|m:MANAGED]->'
```

### match

```
queryBuilder.match()

// equals to 'MATCH')
```
```
queryBuilder.match(c => { return c.node('n') })

// equals to 'MATCH (n)'
```
```
queryBuilder.match(c => {
    return c.node('movie', 'Movie')})

// equals to 'MATCH (movie:Movie)'
```
```
queryBuilder.match(c => {
    return c.node('director', 'Movie', {name: 'Oliver Stone'})})

// equals to "MATCH (director:Movie { name: 'Oliver Stone' })"
```
```
queryBuilder.match(c => {
    return c.node('director', {name: 'Oliver Stone'})})

// equals to "MATCH (director { name: 'Oliver Stone' })"
```
```
queryBuilder.match([
    c => c.node('charlie', 'Person', {name: 'Charlie Sheen'}),
    c => c.node('rob', 'Person', {name: 'Rob Reiner'})
])

// equals to "MATCH (charlie:Person { name: 'Charlie Sheen' }), (rob:Person { name: 'Rob Reiner' })"
```

### optional match

```
queryBuilder.optionalMatch(c => {
    return c.node('n')
})

// equals to 'OPTIONAL MATCH (n)'
```
```
queryBuilder.optionalMatch(c => {
    return c.node('movie', 'Movie')
})

// equals to 'OPTIONAL MATCH (movie:Movie)'
```
```
queryBuilder.optionalMatch(c => {
    return c.node('director', 'Movie', {name: 'Oliver Stone'})
})

// equals to "OPTIONAL MATCH (director:Movie { name: 'Oliver Stone' })"
```
```
queryBuilder.optionalMatch(c => {
    return c.node('director', {name: 'Oliver Stone'})
})

// equals to "OPTIONAL MATCH (director { name: 'Oliver Stone' })"
```
```
queryBuilder.optionalMatch([
    c => c.node('charlie', 'Person', {name: 'Charlie Sheen'}),
    c => c.node('rob', 'Person', {name: 'Rob Reiner'})
])

// equals to "OPTIONAL MATCH (charlie:Person { name: 'Charlie Sheen' }), (rob:Person { name: 'Rob Reiner' })"
```

### group

```
queryBuilder.match(c => c.node('p', 'Person'))
.group(g => {
    return g.optionalMatch(o => {
        return o.node('p')
            .relationOut(':ACTED_IN')
            .node('m1', 'Movie')
    })
    .with('p', 'collect(m1) AS actedInMovies')
})
.group(g => {
    return g.optionalMatch(o => {
        return o.node('p')
            .relationOut(':DIRECTED')
            .node('m2', 'Movie')
    })
    .with('p', 'actedInMovies', 'collect(m1) AS directedMovies')
})
.return('p', 'actedInMovies', 'directedMovies')

// That equals to "MATCH (p:Person) OPTIONAL MATCH (p) -[:ACTED_IN]-> (m1:Movie) WITH p,collect(m1) AS actedInMovies OPTIONAL MATCH (p) -[:DIRECTED]-> (m2:Movie) WITH p,actedInMovies,collect(m1) AS directedMovies RETURN p,actedInMovies,directedMovies"
```

### complex match relation

```
queryBuilder.match(m => {
    return m.node('director', {name: 'Oliver Stone'})
        .relation()
        .node('movie')
})

// equals to "MATCH (director { name: 'Oliver Stone' }) -- (movie)"
```
```
queryBuilder.match(m => {
    return m.node(':Person', {name: 'Oliver Stone'})
        .relation()
        .node('movie', 'Movie')
})

// equals to "MATCH (:Person { name: 'Oliver Stone' }) -- (movie:Movie)"
```
```
queryBuilder.match(m => {
    return m.node(':Person', {name: 'Oliver Stone'})
        .relationOut('r')
        .node('movie')
})

// equals to "MATCH (:Person { name: 'Oliver Stone' }) -[r]-> (movie)"
```
```
queryBuilder.match(m => {
    return m.node('wallstreet', {title: 'Wall Street'})
        .relationIn(r => {
            return r.relate(':ACTED_IN')
                .relate(':DIRECTED')
        })
        .node('person')
})

// equals to "MATCH (wallstreet { title: 'Wall Street' }) <-[:ACTED_IN|:DIRECTED]- (person)"
```
```
queryBuilder.match(m => {
    return m.node('charlie', {name: 'Charlie Sheen'})
        .relationOut(':ACTED_IN')
        .node('movie')
        .relationIn(':DIRECTED')
        .node('director')
}).return('movie.title', 'director.name')

// equals to "MATCH (charlie { name: 'Charlie Sheen' }) -[:ACTED_IN]-> (movie) <-[:DIRECTED]- (director) RETURN movie.title,director.name"
```

### with

```
queryBuilder.with('n') // equals to  'WITH n'
```
```
queryBuilder.with('otherPerson', 'count(*) AS foaf') // equals to  'WITH otherPerson,count(*) AS foaf'
```

### skip

```
queryBuilder.skip(1) // equals to 'SKIP 1'
```
```
queryBuilder.skip('toInteger(3*rand()) + 1') // equals to 'SKIP toInteger(3*rand()) + 1'
```

### delete

```
queryBuilder.delete('n', false) // equals to 'DELETE n'
```
```
queryBuilder.delete('n') // equals to 'DETACH DELETE n'
```

### restore

```
queryBuilder.restore('n') // equals to 'SET n.deleted_at = null'
```

### remove

```
queryBuilder.remove('n.age') // equals to 'REMOVE n.age'
```
```
queryBuilder.remove('n:Algerian') // equals to 'REMOVE n:Algerian'
```

### as

```
queryBuilder.return('n.age').as('y') // equals to 'RETURN n.age AS y'
```

### onMatch

```
queryBuilder.onMatch() // equals to 'ON MATCH'
```

### onCreate

```
queryBuilder.onCreate() // equals to 'ON CREATE'
```

### call

```
queryBuilder.call('db.labels') // equals to 'CALL db.labels'
```
```
queryBuilder.call(c => c.with('x').return('x * 10').as('y')) // equals to 'CALL { WITH x RETURN x * 10 AS y }'
```

### union

```
queryBuilder.union() // equals to 'UNION'
```
```
queryBuilder.union('ALL') // equals to 'UNION ALL'
```

### merge

```
queryBuilder.merge() // equals to 'MERGE'
```
```
queryBuilder.merge(m => m.node('n')) // equals to 'MERGE (n)'
```
```
queryBuilder.merge(m => m.node('movie', 'Movie')) // equals to 'MERGE (movie:Movie)'
```
```
queryBuilder.merge(m => m.node('director', 'Movie', {name: 'Oliver Stone'})) // equals to "MERGE (director:Movie { name: 'Oliver Stone' })"
```
```
queryBuilder.merge(m => m.node('charlie', {name: 'Charlie Sheen', age: 10})) // equals to "MERGE (charlie { name: 'Charlie Sheen', age: 10 })"
```
```
queryBuilder.merge(m => m.node('amine', 'Person', {name: 'Amine OUDJEHIH'})) // equals to "MERGE (amine:Person { name: 'Amine OUDJEHIH' })"
```
```
queryBuilder.merge(m => {
return m.node('zorx')
.relationOut('r', 'ACTED_IN')
.node('wallStreet')
})
// equals to  "MERGE (zorx) -[r:ACTED_IN]-> (wallStreet)"
```
```
queryBuilder.merge(m => {
return m.node('person', 'Person')
.onMatch()
.set('person.found', true)
})
// equals to 'MERGE (person:Person) ON MATCH SET person.found = true'
```

### create

```
queryBuilder.create() // equals to 'CREATE'
```
```
queryBuilder.create(m => m.node('n')) // equals to 'CREATE (n)'
```
```
queryBuilder.create([ m => m.node('n'), m => m.node('b') ])
// equals to 'CREATE (n), (b)'
```
```
queryBuilder.create(m => m.node('movie', 'Movie'))
// equals to 'CREATE (movie:Movie)'
```
```
queryBuilder.create(m => m.node('charlie', {name: 'Charlie Sheen', age: 10}))
// equals to "CREATE (charlie { name: 'Charlie Sheen', age: 10 })"
```
```
queryBuilder.create(m => m.node('amine', 'Person', {name: 'Amine OUDJEHIH'}))
// equals to "CREATE (amine:Person { name: 'Amine OUDJEHIH' })"
```
```
queryBuilder
.create(m => {
  return m.node('zorx')
  .relationOut('r', 'ACTED_IN')
  .node('wallStreet')
})
// equals to "CREATE (zorx) -[r:ACTED_IN]-> (wallStreet)"
```

### set | update

```
queryBuilder.set({
  'p.name': 'Amine',
  'p.position': 'Maintainer'
})
// equals to "SET p.name = 'Amine',p.position = 'Maintainer'"
```
```
queryBuilder.set('p.name', 'Amine')
// equals to "SET p.name = 'Amine'")
```
```
queryBuilder.set('p', {
  name: 'Amine',
  position: 'Maintainer'
})
// equals to "SET p = { name: 'Amine', position: 'Maintainer' }"
```
```
queryBuilder.update({
  'p.name': 'Amine',
  'p.position': 'Maintainer'
})
// equals to "SET p.name = 'Amine',p.position = 'Maintainer'"
```
```
queryBuilder.update('p.name', 'Amine')
// equals to "SET p.name = 'Amine'")
```
```
queryBuilder.update('p', {
  name: 'Amine',
  position: 'Maintainer'
})
// equals to "SET p = { name: 'Amine', position: 'Maintainer' }"
```

### unwind

```
queryBuilder.unwind([1, 2, 3], 'x') // equals to 'UNWIND [1,2,3] AS x'
```
```
queryBuilder.unwind('coll', 'x') // equals to 'UNWIND coll AS x'
```
```
queryBuilder.unwind('(a + b)', 'x') // equals to 'UNWIND (a + b) AS x'
```
```
queryBuilder.unwind([], 'empty') // equals to 'UNWIND [] AS empty'
```
```
queryBuilder.unwind(null, 'empty') // equals to 'UNWIND null AS empty'
```
```
queryBuilder.unwind("$events", 'event') // equals to 'UNWIND $events AS event'
```

## Conditions


### where external variable

```
queryBuilder.where('a.name', 'zorx') // equals to "WHERE a.name = 'zorx'"
```

### where local variable

```
queryBuilder.where('a.name', '$b.name') // equals to "WHERE a.name = b.name"
```

### where symbol

```
queryBuilder.where('a.age', '>=', 18) // equals to "WHERE a.age >= 18"
```

### where id

```
queryBuilder.whereId('n', 17) // equals to "WHERE id(n) = 17")
```
```
queryBuilder.whereId(17) // equals to "WHERE id() = 17")
```

### where between

```
queryBuilder.whereBetween('a.age', 17, 18, '<', '<') // equals to "WHERE 17 < a.age < 18"
```

### where exists

```
queryBuilder.whereExists('a.age') // equals to "WHERE exists(a.age)"
```

### where contains

```
queryBuilder.whereContains('a.name', 'z') // equals to "WHERE a.name CONTAINS 'z'"
```

### where startsWith

```
queryBuilder.whereStartsWith('a.name', 'z') // equals to "WHERE a.name STARTS WITH 'z'"
```

### where endsWith

```
queryBuilder.whereEndsWith('a.name', 'z') // equals to "WHERE a.name ENDS WITH 'z'"
```

### where regex

```
queryBuilder.whereRegex('a.name', 'z.*') // equals to "WHERE a.name =~ 'z.*'"
```

### where in

```
queryBuilder.whereIn('a.age', [17, 18, 19]) // equals to "WHERE a.age IN [17,18,19]"
```

### where label

```
queryBuilder.whereLabel('a', 'Person') // equals to "WHERE a:Person"
```

### where raw

```
queryBuilder.whereRaw('NOT (person)-->(peter)') // equals to "WHERE NOT (person)-->(peter)"
```

### and

```
queryBuilder.where('a.age', 20).and('a.name', 'zorx') // equals to "WHERE a.age = 20 AND a.name = 'zorx'"
```

### or

```
queryBuilder.where('a.age', 20).or('a.name', 'zorx') // equals to "WHERE a.age = 20 OR a.name = 'zorx'"
```

### xor

```
queryBuilder.where('a.age', 20).xor('a.name', 'zorx') // equals to "WHERE a.age = 20 XOR a.name = 'zorx'"
```

### orNot

```
queryBuilder.where('a.age', 20).orNot('a.name', 'Ted') // equals to "WHERE a.age = 20 OR NOT a.name = 'Ted'"
```

### xorNot

```
queryBuilder.where('a.age', 20).xorNot('a.name', 'Ted') // equals to "WHERE a.age = 20 XOR NOT a.name = 'Ted'"
```

### whereNot

```
queryBuilder.whereNot('a.age', 20) // equals to "WHERE NOT a.age = 20"
```

## Combined Conditions

### whereNot combine with other condition
```
queryBuilder.whereNot(e => {
    return e.whereExists('a.age')
  })
// equals to "WHERE NOT (exists(a.age))"
```
```
queryBuilder.whereNot(e => {
    return e.whereEndsWith('n.name', 'y')
  })
// equals to "WHERE NOT (n.name ENDS WITH 'y')"
```

### complex query

```
queryBuilder.where('a.name', 'Peter')
    .xor(c => {
        return c.where('n.age', '<', 30)
        .and('n.name', 'Timothy')
    })
    .orNot(c => {
        return c.where('n.name', 'Timothy')
        .or('n.name', 'Peter')
    })

// equals to "WHERE a.name = 'Peter' XOR (n.age < 30 AND n.name = 'Timothy') OR NOT (n.name = 'Timothy' OR n.name = 'Peter')"
```

### more complex query

```
queryBuilder
    .where('a.name', 'Peter')
    .xor(c => {
        return c.where(c => {
            return c.whereBetween('n.age', 30, 40)
                .or('n.age', '>', 40)
        })
        .and('n.name', 'Timothy')
    })
    .orNot(c => {
        return c.where('n.name', 'Timothy')
        .or(c => {
            return c.where('n.name', 'Peter')
                .and('n.name', 'Jim')
        })
    })

// equals to "WHERE a.name = 'Peter' XOR ((30 <= n.age <= 40 OR n.age > 40) AND n.name = 'Timothy') OR NOT (n.name = 'Timothy' OR (n.name = 'Peter' AND n.name = 'Jim'))"
```
