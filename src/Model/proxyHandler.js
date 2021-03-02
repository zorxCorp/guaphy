'use strict'

const proxyGet = require('./proxyGet')


const proxyHandler = exports = module.exports = {}

/**
 * Setter for proxy object
 *
 * @method set
 *
 * @param  {Object} target
 * @param  {String} name
 * @param  {Mixed} value
 */
proxyHandler.set = function (target, name, value) {
  if (target.isDeleted && name !== '$frozen') {
    throw "You can't set any properties to a deleted instance"
  }

  if (target.__setters__.indexOf(name) > -1) {
    target[name] = value
    return true
  }

  target.set(name, value)
  return true
}

/**
 * Getter for proxy handler
 *
 * @method
 *
 * @param  {Object} target
 * @param  {String} name
 */
proxyHandler.get = proxyGet('$attributes', false, function (target, name) {
  // if (typeof (target.$sideLoaded[name]) !== 'undefined') {
  //   return target.$sideLoaded[name]
  // }
})
