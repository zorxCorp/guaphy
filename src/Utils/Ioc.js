'use strict'

class Ioc {
  constructor() {
    if (!Ioc._instance) {
      this._bindings = {}

      Ioc._instance = this;
    }

    return Ioc._instance;
  }

  getBindings() {
    return this._bindings
  }

  bind (name, implementation) {
    this._bindings[name] = implementation
  }

  use (name) {
    return this._bindings[name]
  }
}


module.exports = new Ioc
