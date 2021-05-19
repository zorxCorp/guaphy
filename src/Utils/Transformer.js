'use strict'

const Collection = require("../Collection")
const _ = require("lodash")
const neo4j = require("neo4j-driver")
const util = require('util');

class Transformer {
  #model = null

  constructor(model) {
    this.#model = model
  }

  static transformField(field, model) {
    if (!field && model) {
      return model.$variable
    }

    if (_.startsWith(field, '$')) {
      return field.substring(1);
    }

    if (!_.isString(field) || !model) {
      return field
    }

    // if (field.split('.').length) {
    //   return field
    // }

    if (_.startsWith(field, model.$variable)) {
      return field
    }

    return `${model.$variable}.${field}`
  }

	static transformVariable(v) {
		if (_.startsWith(v, '$')) {
			return v.substring(1);
		}

		if (_.isNumber(v)) {
			return _.toNumber(v);
		}

		if (_.isArray(v)) {
			return '[' + _.map(v, e => this.transformVariable(e)).join(',') + ']'
		}

		if (_.isObject(v)) {
			return util.inspect(v);
		}

		if (_.isBoolean(v)) {
			return v.toString();
		}

		if (_.isNull(v)) {
			return 'null'
		}

		return `'${v}'`;
	}

	transformRecords(records) {
		if (!records.length) {
			return new Collection();
		}

		return new Collection(_.flatten(_.map(records, record => this._transformRecord(record))))
	}

  _prepareObjectwithRelation(record) {
    if (!record.__relationProperty || !this.#model) {
      return record
    }

    const relation = {...record.__relationProperty}
    delete record.__relationProperty

    record[this.#model.$variable].$relationProperties = this._transformRelation(relation).toJson()

    return record
  }

	_transformRecord(record) {
    const objRecord = this._prepareObjectwithRelation(record.toObject())
    let result;
    let parentNode;

    if (this.#model) {
      parentNode = this._transformValue(objRecord[this.#model.$variable]);
    }

    if (this.#model && _.keys(this.#model.$withRelations).length && parentNode) {
      result = this._transformRelatedRecord(objRecord, parentNode)
    }else {
      result = _.mapValues(objRecord, (value, key) => this._transformValue(value))
    }

    if (this.#model) {
      return _.toArray(result);
    }

    return result
	}

  _addRelationPropertyToNode(relationVar, node, record) {
    const properties = record[`${relationVar}_relationProperties`];

    if (neo4j.isInt(properties)) {
      return node
    }

    if (!properties) {
      return node
    }

    const nodeId = neo4j.integer.toString(node.identity)

    const relation = _.head(_.filter(properties, property => {
      return neo4j.integer.toString(property.end) == nodeId
    }))

    if (!relation) {
      return node
    }

    node.$relationProperties = this._transformRelation(relation).toJson()

    return node
  }

  _transformRelatedRecord(record, parentNode) {
    _.each(this.#model.$withRelations, (relationVar, relationKey) => {
      let relations;
      let relation = parentNode[relationKey]()
      let relationName = relationKey;

      if (neo4j.isInt(record[`${relationVar}_collection`])) {
        relations = this._convertInteger(record[`${relationVar}_collection`])
        relationName = `${relationKey}Count`
      }else{
        relations = new Collection(
          _.map(record[`${relationVar}_collection`], r => {
            r = this._addRelationPropertyToNode(relationVar, r, record)
            return this._transformValue(r, relation._attachedTo)
          })
        )

        if (relation.constructor.name == 'RelatedToOne') {
          relations = relations.first()
        }
      }

      parentNode.$relations[relationName] = relations
    })

    return [parentNode]
  }

	_transformValue(value, model) {
		if (this._isPlainValue(value)) {
      return value;
    }

    if (_.isArray(value)) {
      return _.map(value, v => this._transformValue(v));
    }

    if (neo4j.isInt(value)) {
      return this._convertInteger(value);
    }

    if (this._isNode(value)) {
      return this._transformNode(value, model);
    }

    if (this._isRelation(value)) {
      return this._transformRelation(value, model);
    }

    if (_.isObject(value)) {
      return _.mapValues(value, v => this._transformValue(v));
    }

    return null;
	}

	_transformNode(node, model) {
		return this._convertToModel({
      identity: neo4j.integer.toString(node.identity),
      labels: node.labels,
      properties: _.mapValues(node.properties, this._transformValue.bind(this)),
    }, model, node.$relationProperties);
	}

	_transformRelation(rel, model) {
    return this._convertToModel({
      identity: neo4j.integer.toString(rel.identity),
      start: neo4j.integer.toString(rel.start),
      end: neo4j.integer.toString(rel.end),
      label: rel.type,
      properties: _.mapValues(rel.properties, this._transformValue.bind(this)),
    }, model);
  }

  _convertToModel(obj, model, relationProperties = {}) {
    if (!this.#model) {
      return obj
    }

    let instance = model ? new model : new this.#model.constructor

    if (this.#model.$relationProperties) {
      instance.$relationProperties = relationProperties
    }

    instance.$result = {...obj}
    // instance.$variable = this.#model.$variable

    instance.$primaryKey = _.toNumber(obj.identity)

    if (this.#model.$withRelations) {
      instance.$withRelations = this.#model.$withRelations
    }


    instance.$attributes = {..._.result(obj, 'properties', {})}
    instance.$attributes[instance._primaryKey] = instance.$primaryKey

    return instance
  }

	_convertInteger(num) {
    if (neo4j.integer.inSafeRange(num)) {
      return neo4j.integer.toNumber(num)
    }

    return neo4j.integer.toString(num)
  }

	_isPlainValue(value) {
    const type = typeof value;

    return value == null || type === 'string' || type === 'boolean' || type === 'number'
	}

	_isRelation(rel) {
    return !!(rel.identity && rel.type && rel.properties && rel.start && rel.end)
  }

  _isRelatedNode(node, key) {
    return _.values(this.#model.$withRelations).indexOf(key) > -1
  }

	_isNode(node) {
		return node !== null
		  && typeof node === 'object'
		  && !_.isArray(node)
		  && node.identity
		  && node.labels
		  && node.properties
	}
}


module.exports = Transformer
