'use strict'

const test = require('japa')

const Model = require("../../src/Model")
const QueryBuilder = require("../../src/QueryBuilder")
const Collection = require("../../src/Collection")

test.group('QueryBuilder', (group) => {
	test('cypher', async (assert) => {
		let result = await (new QueryBuilder).cypher('CREATE (a:Person {name: "leeto"}), (b:User {name: "zorx"}) RETURN a,b').fetch()
		assert.instanceOf(result, Collection)

		result = result.toJson()

		assert.deepEqual(result[0].a.properties, { name: 'leeto' });
		assert.deepEqual(result[0].a.labels, [ 'Person' ]);
		assert.isNotNull(result[0].a.identity);

		assert.deepEqual(result[0].b.properties, { name: 'zorx' });
		assert.deepEqual(result[0].b.labels, [ 'User' ]);
		assert.isNotNull(result[0].b.identity);
	})

	test('can chain cypher methods', async (assert) => {
		let result = await (new QueryBuilder)
			.cypher('CREATE (a:Person {name: "leeto"}), (b:Person {name: "zorx"})')
			.cypher('RETURN a,b')
			.fetch()

		assert.instanceOf(result, Collection)

		result = result.toJson()

		assert.deepEqual(result[0].a.properties, { name: 'leeto' });
		assert.deepEqual(result[0].a.labels, [ 'Person' ]);
		assert.isNotNull(result[0].a.identity);

		assert.deepEqual(result[0].b.properties, { name: 'zorx' });
		assert.deepEqual(result[0].b.labels, [ 'Person' ]);
		assert.isNotNull(result[0].b.identity);
	})

	test('toCypher | toCYPHER', async (assert) => {
		let query = 'CREATE (a:Person {name: "zorx"}) RETURN a';

		let result = (new QueryBuilder).cypher(query).toCypher()
		let result2 = (new QueryBuilder).cypher(query).toCYPHER()

		assert.equal(result, query)
		assert.equal(result2, query)
	})

	test('fetch', async (assert) => {
		await (new QueryBuilder).cypher('CREATE (a:Person {name: "leeto"}), (b:Person {name: "zorx"}) RETURN a,b').fetch()
		await (new QueryBuilder).cypher('CREATE (a:Person {name: "leeto"}), (b:Person {name: "zorx"}) RETURN a,b').fetch()

		let result = await (new QueryBuilder).cypher('MATCH (n:Person) RETURN n').fetch()
		assert.instanceOf(result, Collection)

		assert.isTrue(result.count() > 1)
	})

	test('first', async (assert) => {
		let result = await (new QueryBuilder).cypher('CREATE (a:Person {name: "leeto"}), (b:Person {name: "zorx"}) RETURN a,b').first()

		assert.deepEqual(result.a.properties, { name: 'leeto' });
		assert.deepEqual(result.a.labels, [ 'Person' ]);
		assert.isNotNull(result.a.identity);

		assert.deepEqual(result.b.properties, { name: 'zorx' });
		assert.deepEqual(result.b.labels, [ 'Person' ]);
		assert.isNotNull(result.b.identity);

		result = await (new QueryBuilder).cypher('MATCH (n:Person) RETURN n').first()
		assert.isNotNull(result.n.properties.name);
		assert.deepEqual(result.n.labels, [ 'Person' ]);
		assert.isNotNull(result.n.identity);
	})


	test('count', async (assert) => {
		let result = await (new QueryBuilder).cypher('MATCH (n:Person) RETURN n').fetch()
		let count = await (new QueryBuilder).cypher('MATCH (n:Person)').count()

		assert.equal(result.count(), count)
	})


	test.group('Clauses', (group) => {
		test('limit', async (assert) => {
			await (new QueryBuilder).cypher('CREATE (a:Person {name: "leeto"}), (b:Person {name: "zorx"}) RETURN a,b').fetch()
			await (new QueryBuilder).cypher('CREATE (a:Person {name: "leeto"}), (b:Person {name: "zorx"}) RETURN a,b').fetch()

			let result = await (new QueryBuilder).cypher('MATCH (n:Person) RETURN n').limit(1).fetch()

			assert.instanceOf(result, Collection)
			assert.equal(result.count(),  1)
		})

		test('orderBy', async (assert) => {
			assert.equal((new QueryBuilder).orderBy('a.name').toCypher(),  'ORDER BY a.name')
			assert.equal((new QueryBuilder).orderBy('a.name', 'DESC').toCypher(),  'ORDER BY a.name DESC')
			assert.equal((new QueryBuilder).orderBy(['a.name', 'b.name']).toCypher(),  'ORDER BY a.name,b.name')
			assert.equal((new QueryBuilder).orderBy(['a.name', 'b.name'], 'DESC').toCypher(),  'ORDER BY a.name DESC,b.name DESC')
			assert.equal((new QueryBuilder).orderBy([{'a.name': 'DESC'}, 'b.name']).toCypher(),  'ORDER BY a.name DESC,b.name')
			assert.equal((new QueryBuilder).orderBy([{'a.name': 'DESC'}, {'b.name': 'DESC'}]).toCypher(),  'ORDER BY a.name DESC,b.name DESC')
			assert.equal((new QueryBuilder).orderBy([{'a.name': 'DESC', 'b.name': 'DESC'}]).toCypher(),  'ORDER BY a.name DESC,b.name DESC')
			assert.equal((new QueryBuilder).orderBy(['a.name', {'b.name': 'DESC'}]).toCypher(),  'ORDER BY a.name,b.name DESC')
		})

		test('return', async (assert) => {
			assert.equal((new QueryBuilder).return('a.name').toCypher(),  'RETURN a.name')
			assert.equal((new QueryBuilder).return('a.name', 'b.name').toCypher(),  'RETURN a.name,b.name')
		})

		test('node', async (assert) => {
			assert.equal((new QueryBuilder).node('').toCypher(),  '()')
			assert.equal((new QueryBuilder).node('n').toCypher(),  '(n)')
			assert.equal((new QueryBuilder).node(null, 'Movie').toCypher(),  '(:Movie)')
			assert.equal((new QueryBuilder).node(':Movie').toCypher(),  '(:Movie)')
			assert.equal((new QueryBuilder).node('movie', 'Movie').toCypher(),  '(movie:Movie)')
			assert.equal((new QueryBuilder).node('director', 'Movie', {name: 'Oliver Stone'}).toCypher(),  "(director:Movie { name: 'Oliver Stone' })")
			assert.equal((new QueryBuilder).node('director', {name: 'Oliver Stone'}).toCypher(),  "(director { name: 'Oliver Stone' })")
		})

		test('relation', async (assert) => {
			assert.equal((new QueryBuilder).relation().toCypher(),  '--')
			assert.equal((new QueryBuilder).relation('r').toCypher(),  '-[r]-')
			assert.equal((new QueryBuilder).relation(null, 'ACTED_IN').toCypher(),  '-[:ACTED_IN]-')
			assert.equal((new QueryBuilder).relation(':ACTED_IN').toCypher(),  '-[:ACTED_IN]-')
			assert.equal((new QueryBuilder).relation('r', 'ACTED_IN').toCypher(),  '-[r:ACTED_IN]-')
			assert.equal((new QueryBuilder).relation(r => {
				return r.relate(':ACTED_IN')
					.relate(':DIRECTED')
			}).toCypher(),  '-[:ACTED_IN|:DIRECTED]-')

			assert.equal((new QueryBuilder).relation(r => {
				return r.relate('r', 'ACTED_IN')
					.relate(':DIRECTED')
			}).toCypher(),  '-[r:ACTED_IN|:DIRECTED]-')

			assert.equal((new QueryBuilder).relation(r => {
				return r.relate('r', 'ACTED_IN')
					.relate('d', 'DIRECTED')
			}).toCypher(),  '-[r:ACTED_IN|d:DIRECTED]-')

			assert.equal((new QueryBuilder).relation(r => {
				return r.relate(null, 'ACTED_IN')
					.relate('d', 'DIRECTED')
			}).toCypher(),  '-[:ACTED_IN|d:DIRECTED]-')

			assert.equal((new QueryBuilder).relation(r => {
				return r.relate(null, 'ACTED_IN')
					.relate('d', 'DIRECTED')
					.relate('m', 'MANAGED')
			}).toCypher(),  '-[:ACTED_IN|d:DIRECTED|m:MANAGED]-')
		})

		test('relationIn', async (assert) => {
			assert.equal((new QueryBuilder).relationIn().toCypher(),  '<--')
			assert.equal((new QueryBuilder).relationIn('r').toCypher(),  '<-[r]-')
			assert.equal((new QueryBuilder).relationIn(null, 'ACTED_IN').toCypher(),  '<-[:ACTED_IN]-')
			assert.equal((new QueryBuilder).relationIn(':ACTED_IN').toCypher(),  '<-[:ACTED_IN]-')
			assert.equal((new QueryBuilder).relationIn('r', 'ACTED_IN').toCypher(),  '<-[r:ACTED_IN]-')
			assert.equal((new QueryBuilder).relationIn(r => {
				return r.relate(':ACTED_IN')
					.relate(':DIRECTED')
			}).toCypher(),  '<-[:ACTED_IN|:DIRECTED]-')

			assert.equal((new QueryBuilder).relationIn(r => {
				return r.relate('r', 'ACTED_IN')
					.relate(':DIRECTED')
			}).toCypher(),  '<-[r:ACTED_IN|:DIRECTED]-')

			assert.equal((new QueryBuilder).relationIn(r => {
				return r.relate('r', 'ACTED_IN')
					.relate('d', 'DIRECTED')
			}).toCypher(),  '<-[r:ACTED_IN|d:DIRECTED]-')

			assert.equal((new QueryBuilder).relationIn(r => {
				return r.relate(null, 'ACTED_IN')
					.relate('d', 'DIRECTED')
			}).toCypher(),  '<-[:ACTED_IN|d:DIRECTED]-')

			assert.equal((new QueryBuilder).relationIn(r => {
				return r.relate(null, 'ACTED_IN')
					.relate('d', 'DIRECTED')
					.relate('m', 'MANAGED')
			}).toCypher(),  '<-[:ACTED_IN|d:DIRECTED|m:MANAGED]-')
		})

		test('relationOut', async (assert) => {
			assert.equal((new QueryBuilder).relationOut().toCypher(),  '-->')
			assert.equal((new QueryBuilder).relationOut('r').toCypher(),  '-[r]->')
			assert.equal((new QueryBuilder).relationOut(null, 'ACTED_IN').toCypher(),  '-[:ACTED_IN]->')
			assert.equal((new QueryBuilder).relationOut(':ACTED_IN').toCypher(),  '-[:ACTED_IN]->')
			assert.equal((new QueryBuilder).relationOut('r', 'ACTED_IN').toCypher(),  '-[r:ACTED_IN]->')
			assert.equal((new QueryBuilder).relationOut('r', 'ACTED_IN', {role: 'Sophia'}).toCypher(),  "-[r:ACTED_IN { role: 'Sophia' }]->")

			assert.equal((new QueryBuilder).relationOut(r => {
				return r.relate(':ACTED_IN')
					.relate(null, 'DIRECTED', {since: 1985})
			}).toCypher(),  '-[:ACTED_IN|:DIRECTED { since: 1985 }]->')

			assert.equal((new QueryBuilder).relationOut(r => {
				return r.relate('r', 'ACTED_IN')
					.relate(':DIRECTED')
			}).toCypher(),  '-[r:ACTED_IN|:DIRECTED]->')

			assert.equal((new QueryBuilder).relationOut(r => {
				return r.relate('r', 'ACTED_IN')
					.relate('d', 'DIRECTED')
			}).toCypher(),  '-[r:ACTED_IN|d:DIRECTED]->')

			assert.equal((new QueryBuilder).relationOut(r => {
				return r.relate(null, 'ACTED_IN')
					.relate('d', 'DIRECTED')
			}).toCypher(),  '-[:ACTED_IN|d:DIRECTED]->')

			assert.equal((new QueryBuilder).relationOut(r => {
				return r.relate(null, 'ACTED_IN')
					.relate('d', 'DIRECTED')
					.relate('m', 'MANAGED')
			}).toCypher(),  '-[:ACTED_IN|d:DIRECTED|m:MANAGED]->')
		})

		test('match', async (assert) => {
			assert.equal((new QueryBuilder).match().toCypher(),  'MATCH')

			assert.equal((new QueryBuilder).match(c => {
				return c.node('n')
			}).toCypher(),  'MATCH (n)')

			assert.equal((new QueryBuilder).match(c => {
				return c.node('movie', 'Movie')
			}).toCypher(),  'MATCH (movie:Movie)')

			assert.equal((new QueryBuilder).match(c => {
				return c.node('director', 'Movie', {name: 'Oliver Stone'})
			}).toCypher(),  "MATCH (director:Movie { name: 'Oliver Stone' })")

			assert.equal((new QueryBuilder).match(c => {
				return c.node('director', {name: 'Oliver Stone'})
			}).toCypher(),  "MATCH (director { name: 'Oliver Stone' })")

			assert.equal((new QueryBuilder).match([
				c => c.node('charlie', 'Person', {name: 'Charlie Sheen'}),
				c => c.node('rob', 'Person', {name: 'Rob Reiner'})
			]).toCypher(),  "MATCH (charlie:Person { name: 'Charlie Sheen' }), (rob:Person { name: 'Rob Reiner' })")
		})

		test('optional match', async (assert) => {
			assert.equal((new QueryBuilder).optionalMatch(c => {
				return c.node('n')
			}).toCypher(),  'OPTIONAL MATCH (n)')

			assert.equal((new QueryBuilder).optionalMatch(c => {
				return c.node('movie', 'Movie')
			}).toCypher(),  'OPTIONAL MATCH (movie:Movie)')

			assert.equal((new QueryBuilder).optionalMatch(c => {
				return c.node('director', 'Movie', {name: 'Oliver Stone'})
			}).toCypher(),  "OPTIONAL MATCH (director:Movie { name: 'Oliver Stone' })")

			assert.equal((new QueryBuilder).optionalMatch(c => {
				return c.node('director', {name: 'Oliver Stone'})
			}).toCypher(),  "OPTIONAL MATCH (director { name: 'Oliver Stone' })")

			assert.equal((new QueryBuilder).optionalMatch([
				c => c.node('charlie', 'Person', {name: 'Charlie Sheen'}),
				c => c.node('rob', 'Person', {name: 'Rob Reiner'})
			]).toCypher(),  "OPTIONAL MATCH (charlie:Person { name: 'Charlie Sheen' }), (rob:Person { name: 'Rob Reiner' })")
		})

		test('group', async (assert) => {
			assert.equal((new QueryBuilder).match(c => c.node('p', 'Person'))
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
				.toCypher(),  "MATCH (p:Person) OPTIONAL MATCH (p) -[:ACTED_IN]-> (m1:Movie) WITH p,collect(m1) AS actedInMovies OPTIONAL MATCH (p) -[:DIRECTED]-> (m2:Movie) WITH p,actedInMovies,collect(m1) AS directedMovies RETURN p,actedInMovies,directedMovies")
		})

		test('complex match relation', async (assert) => {
			assert.equal((new QueryBuilder).match(m => {
				return m.node('director', {name: 'Oliver Stone'})
					.relation()
					.node('movie')
			}).toCypher(), "MATCH (director { name: 'Oliver Stone' }) -- (movie)")

			assert.equal((new QueryBuilder).match(m => {
				return m.node(':Person', {name: 'Oliver Stone'})
					.relation()
					.node('movie', 'Movie')
			}).toCypher(), "MATCH (:Person { name: 'Oliver Stone' }) -- (movie:Movie)")

			assert.equal((new QueryBuilder).match(m => {
				return m.node(':Person', {name: 'Oliver Stone'})
					.relationOut('r')
					.node('movie')
			}).toCypher(), "MATCH (:Person { name: 'Oliver Stone' }) -[r]-> (movie)")

			assert.equal((new QueryBuilder).match(m => {
				return m.node('wallstreet', {title: 'Wall Street'})
					.relationIn(r => {
						return r.relate(':ACTED_IN')
							.relate(':DIRECTED')
					})
					.node('person')
			}).toCypher(), "MATCH (wallstreet { title: 'Wall Street' }) <-[:ACTED_IN|:DIRECTED]- (person)")

			assert.equal((new QueryBuilder).match(m => {
				return m.node('charlie', {name: 'Charlie Sheen'})
					.relationOut(':ACTED_IN')
					.node('movie')
					.relationIn(':DIRECTED')
					.node('director')
			}).return('movie.title', 'director.name').toCypher(), "MATCH (charlie { name: 'Charlie Sheen' }) -[:ACTED_IN]-> (movie) <-[:DIRECTED]- (director) RETURN movie.title,director.name")
		})

		test('with', async (assert) => {
			assert.equal((new QueryBuilder).with('otherPerson', 'count(*) AS foaf').toCypher(),  'WITH otherPerson,count(*) AS foaf')
			assert.equal((new QueryBuilder).with('n').toCypher(),  'WITH n')
		})

		test('skip', async (assert) => {
			assert.equal((new QueryBuilder).skip(1).toCypher(),  'SKIP 1')
			assert.equal((new QueryBuilder).skip('toInteger(3*rand()) + 1').toCypher(),  'SKIP toInteger(3*rand()) + 1')
		})

		test('delete', async (assert) => {
			assert.equal((new QueryBuilder).delete('n', false).toCypher(),  'DELETE n')
			assert.equal((new QueryBuilder).delete('n').toCypher(),  'DETACH DELETE n')
		})


		test('restore', async (assert) => {
			assert.equal((new QueryBuilder).restore('n').toCypher(),  'SET n.deleted_at = null')
		})

		test('remove', async (assert) => {
			assert.equal((new QueryBuilder).remove('n.age').toCypher(),  'REMOVE n.age')
			assert.equal((new QueryBuilder).remove('n:Algerian').toCypher(),  'REMOVE n:Algerian')
		})

		test('as', async (assert) => {
			assert.equal((new QueryBuilder).return('n.age').as('y').toCypher(),  'RETURN n.age AS y')
		})

		test('onMatch', async (assert) => {
			assert.equal((new QueryBuilder).onMatch().toCypher(),  'ON MATCH')
		})

		test('onCreate', async (assert) => {
			assert.equal((new QueryBuilder).onCreate().toCypher(),  'ON CREATE')
		})

		test('call', async (assert) => {
			assert.equal((new QueryBuilder).call('db.labels').toCypher(),  'CALL db.labels')
			assert.equal((new QueryBuilder).call(c => c.with('x').return('x * 10').as('y')).toCypher(),  'CALL { WITH x RETURN x * 10 AS y }')
		})

		test('union', async (assert) => {
			assert.equal((new QueryBuilder).union().toCypher(),  'UNION')
			assert.equal((new QueryBuilder).union('ALL').toCypher(),  'UNION ALL')
		})

		test('merge', async (assert) => {
			assert.equal((new QueryBuilder).merge().toCypher(),  'MERGE')
			assert.equal((new QueryBuilder).merge(m => m.node('n')).toCypher(),  'MERGE (n)')
			assert.equal((new QueryBuilder).merge(m => m.node('movie', 'Movie')).toCypher(),  'MERGE (movie:Movie)')
			assert.equal((new QueryBuilder).merge(m => m.node('director', 'Movie', {name: 'Oliver Stone'})).toCypher(),  "MERGE (director:Movie { name: 'Oliver Stone' })")
			assert.equal((new QueryBuilder).merge(m => m.node('charlie', {name: 'Charlie Sheen', age: 10})).toCypher(),  "MERGE (charlie { name: 'Charlie Sheen', age: 10 })")
			assert.equal((new QueryBuilder).merge(m => m.node('amine', 'Person', {name: 'Amine OUDJEHIH'})).toCypher(),  "MERGE (amine:Person { name: 'Amine OUDJEHIH' })")
			assert.equal((new QueryBuilder)
				.merge(m => {
					return m.node('zorx')
					.relationOut('r', 'ACTED_IN')
					.node('wallStreet')
				})
				.toCypher(),  "MERGE (zorx) -[r:ACTED_IN]-> (wallStreet)")

			assert.equal((new QueryBuilder).merge(m => {
				return m.node('person', 'Person')
					.onMatch()
					.set('person.found', true)
			}).toCypher(),  'MERGE (person:Person) ON MATCH SET person.found = true')
		})

		test('create', async (assert) => {
			assert.equal((new QueryBuilder).create().toCypher(),  'CREATE')
			assert.equal((new QueryBuilder).create(m => m.node('n')).toCypher(),  'CREATE (n)')

			assert.equal((new QueryBuilder).create([
				m => m.node('n'),
				m => m.node('b')
			]).toCypher(),  'CREATE (n), (b)')

			assert.equal((new QueryBuilder).create(m => m.node('movie', 'Movie')).toCypher(),  'CREATE (movie:Movie)')
			assert.equal((new QueryBuilder).create(m => m.node('charlie', {name: 'Charlie Sheen', age: 10})).toCypher(),  "CREATE (charlie { name: 'Charlie Sheen', age: 10 })")
			assert.equal((new QueryBuilder).create(m => m.node('amine', 'Person', {name: 'Amine OUDJEHIH'})).toCypher(),  "CREATE (amine:Person { name: 'Amine OUDJEHIH' })")
			assert.equal((new QueryBuilder)
				.create(m => {
					return m.node('zorx')
					.relationOut('r', 'ACTED_IN')
					.node('wallStreet')
				})
				.toCypher(),  "CREATE (zorx) -[r:ACTED_IN]-> (wallStreet)")
		})

		test('set | update', async (assert) => {
			assert.equal((new QueryBuilder).set({
				'p.name': 'Amine',
				'p.position': 'Maintainer'
			}).toCypher(),  "SET p.name = 'Amine',p.position = 'Maintainer'")

			assert.equal((new QueryBuilder).set('p.name', 'Amine')
				.toCypher(),  "SET p.name = 'Amine'")

			assert.equal((new QueryBuilder).set('p', {
				name: 'Amine',
				position: 'Maintainer'
			})
				.toCypher(),  "SET p = { name: 'Amine', position: 'Maintainer' }")

			assert.equal((new QueryBuilder).update({
				'p.name': 'Amine',
				'p.position': 'Maintainer'
			}).toCypher(),  "SET p.name = 'Amine',p.position = 'Maintainer'")

			assert.equal((new QueryBuilder).update('p.name', 'Amine')
				.toCypher(),  "SET p.name = 'Amine'")

			assert.equal((new QueryBuilder).update('p', {
				name: 'Amine',
				position: 'Maintainer'
			})
				.toCypher(),  "SET p = { name: 'Amine', position: 'Maintainer' }")
		})

		test('unwind', async (assert) => {
			assert.equal((new QueryBuilder).unwind([1, 2, 3], 'x').toCypher(),  'UNWIND [1,2,3] AS x')
			assert.equal((new QueryBuilder).unwind('coll', 'x').toCypher(),  'UNWIND coll AS x')
			assert.equal((new QueryBuilder).unwind('(a + b)', 'x').toCypher(),  'UNWIND (a + b) AS x')
			assert.equal((new QueryBuilder).unwind([], 'empty').toCypher(),  'UNWIND [] AS empty')
			assert.equal((new QueryBuilder).unwind(null, 'empty').toCypher(),  'UNWIND null AS empty')
			assert.equal((new QueryBuilder).unwind("$events", 'event').toCypher(),  'UNWIND $events AS event')
		})
	})

	test.group('Conditions', (group) => {
		test('where external variable', async (assert) => {
			let result = (new QueryBuilder).where('a.name', 'zorx').toCypher()

			assert.equal(result, "WHERE a.name = 'zorx'")
		})

		test('where local variable', async (assert) => {
			let result = (new QueryBuilder).where('a.name', '$b.name').toCypher()

			assert.equal(result, "WHERE a.name = b.name")
		})

		test('where symbol', async (assert) => {
			let result = (new QueryBuilder).where('a.age', '>=', 18).toCypher()

			assert.equal(result, "WHERE a.age >= 18")
		})

		test('where id', async (assert) => {
			assert.equal((new QueryBuilder).whereId('n', 17).toCypher(), "WHERE id(n) = 17")
			assert.equal((new QueryBuilder).whereId(17).toCypher(), "WHERE id() = 17")
		})

    test('where id in', async (assert) => {
      assert.equal((new QueryBuilder).whereIdIn([17]).toCypher(), "WHERE id() IN [17]")
      assert.equal((new QueryBuilder).whereIdIn('n', [17]).toCypher(), "WHERE id(n) IN [17]")
    })

		test('where between', async (assert) => {
			let result = (new QueryBuilder).whereBetween('a.age', 17, 18, '<', '<').toCypher()

			assert.equal(result, "WHERE 17 < a.age < 18")
		})

		test('where exists', async (assert) => {
			let result = (new QueryBuilder).whereExists('a.age').toCypher()

			assert.equal(result, "WHERE exists(a.age)")
		})

		test('where contains', async (assert) => {
			let result = (new QueryBuilder).whereContains('a.name', 'z').toCypher()

			assert.equal(result, "WHERE a.name CONTAINS 'z'")
		})

		test('where startsWith', async (assert) => {
			let result = (new QueryBuilder).whereStartsWith('a.name', 'z').toCypher()

			assert.equal(result, "WHERE a.name STARTS WITH 'z'")
		})

		test('where endsWith', async (assert) => {
			let result = (new QueryBuilder).whereEndsWith('a.name', 'z').toCypher()

			assert.equal(result, "WHERE a.name ENDS WITH 'z'")
		})

		test('where regex', async (assert) => {
			let result = (new QueryBuilder).whereRegex('a.name', 'z.*').toCypher()

			assert.equal(result, "WHERE a.name =~ 'z.*'")
		})

		test('where in', async (assert) => {
			let result = (new QueryBuilder).whereIn('a.age', [17, 18, 19]).toCypher()

			assert.equal(result, "WHERE a.age IN [17,18,19]")
		})

		test('where label', async (assert) => {
			let result = (new QueryBuilder).whereLabel('a', 'Person').toCypher()

			assert.equal(result, "WHERE a:Person")
		})

		test('where raw', async (assert) => {
			let result = (new QueryBuilder).whereRaw('NOT (person)-->(peter)').toCypher()

			assert.equal(result, "WHERE NOT (person)-->(peter)")
		})

		test('and', async (assert) => {
			let result = (new QueryBuilder).where('a.age', 20).and('a.name', 'zorx').toCypher()

			assert.equal(result, "WHERE a.age = 20 AND a.name = 'zorx'")
		})

		test('or', async (assert) => {
			let result = (new QueryBuilder).where('a.age', 20).or('a.name', 'zorx').toCypher()

			assert.equal(result, "WHERE a.age = 20 OR a.name = 'zorx'")
		})

		test('xor', async (assert) => {
			let result = (new QueryBuilder).where('a.age', 20).xor('a.name', 'zorx').toCypher()

			assert.equal(result, "WHERE a.age = 20 XOR a.name = 'zorx'")
		})

		test('orNot', async (assert) => {
			let result = (new QueryBuilder).where('a.age', 20).orNot('a.name', 'Ted').toCypher()

			assert.equal(result, "WHERE a.age = 20 OR NOT a.name = 'Ted'")
		})

		test('xorNot', async (assert) => {
			let result = (new QueryBuilder).where('a.age', 20).xorNot('a.name', 'Ted').toCypher()

			assert.equal(result, "WHERE a.age = 20 XOR NOT a.name = 'Ted'")
		})

		test('whereNot', async (assert) => {
			let result = (new QueryBuilder).whereNot('a.age', 20).toCypher()

			assert.equal(result, "WHERE NOT a.age = 20")
		})

		test.group('Combined Conditions', (group) => {
			test('whereNot combine with other condition', async (assert) => {
				let result = (new QueryBuilder).whereNot(e => {
					return e.whereExists('a.age')
				}).toCypher()

				assert.equal(result, "WHERE NOT (exists(a.age))")

				let query = (new QueryBuilder).whereNot(e => {
					return e.whereEndsWith('n.name', 'y')
				}).toCypher()

				assert.equal(query, "WHERE NOT (n.name ENDS WITH 'y')")
			})

			test('complex query', async (assert) => {
				let result = (new QueryBuilder).where('a.name', 'Peter')
					.xor(c => {
						return c.where('n.age', '<', 30)
						.and('n.name', 'Timothy')
					})
					.orNot(c => {
						return c.where('n.name', 'Timothy')
						.or('n.name', 'Peter')
					})
					.toCypher()

				assert.equal(result, "WHERE a.name = 'Peter' XOR (n.age < 30 AND n.name = 'Timothy') OR NOT (n.name = 'Timothy' OR n.name = 'Peter')")
			})

			test('more complex query', async (assert) => {
				let result = (new QueryBuilder).where('a.name', 'Peter')
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
					.toCypher()

				assert.equal(result, "WHERE a.name = 'Peter' XOR ((30 <= n.age <= 40 OR n.age > 40) AND n.name = 'Timothy') OR NOT (n.name = 'Timothy' OR (n.name = 'Peter' AND n.name = 'Jim'))")
			})
		})
	});
})
