/*globals Plates, ansiparse, screenfull, ZeroClipboard */
/**
 * @TODO implement options.silence so we can silence pointless emit calls
 */
(function (root, undefined) {
  "use strict";

  // save local references to slice
  var slice = Array.prototype.slice
    , toString = Object.prototype.toString
    , documentElement = document.documentElement
    , uniqueId = 0
    , _Cortex = root.Cortex
    , _$ = root.$;

  // Create the top level namespace. All plugins and dependencies will be
  // attached to this.
  var Cortex = root.Cortex = {};

  /**
   * Expose the current version number of the Cortex Library.
   *
   * @type {String}
   * @api public
   */
  Cortex.version = '0.0.0';

  /**
   * Simple conflict handling if we are overriding the $ or other Cortex
   * instances. Basically, if you need this function you are doing something
   * wrong.
   *
   * @param {Boolean} selector $ selector only
   * @api public
   */
  Cortex.noConflict = function noConflict(selector) {
    if (selector) {
      if (_$) root.$ = _$;
    } else {
      if (_Cortex) root.Cortex = _Cortex;
    }
  };

  /**
   * Simple type checking.
   *
   * @param {Mixed} type
   * @param {String} expected
   * @returns {Mixed}
   */
  Cortex.is = function is(type, expected) {
    var instance = toString.call(type).slice(8, -1).toLowerCase();

    return expected
      ? instance === expected
      : instance;
  };

  /**
   * Cortex.forEach is a simple iterator. Iterations should be delegated to the
   * Native functions when ever possible.
   *
   * @param {Mixed} collection
   * @param {Function} iterator
   * @param {Mixed} context
   * @api public
   */
  Cortex.forEach = Cortex.each = function forEach(collection, iterator, context) {
    if (!collection) return;
    var i = 0;

    if ('forEach' in collection) {
      collection.forEach(iterator, context);
    } else if (Array.isArray(collection)) {
      for (var l = collection.length; i < l; i++) {
        if (iterator.call(context, collection[i], i, collection) === false) break;
      }
    } else {
      for (i in collection) {
        if (iterator.call(context, collection[i], i, collection) === false) break;
      }
    }

    return this;
  };

  /**
   * Cortex.filter returns all elements that pass the truth test. Filtering
   * should be delegated to native function when ever possible.
   *
   * @param {Mixed} collection
   * @param {Function} iterator
   * @param {Mixed} context
   * @returns {Array}
   * @api pubic
   */
  Cortex.filter = Cortex.select = function filter(collection, iterator, context) {
    var results = [];

    if (!collection) return results;
    if ('filter' in collection) return collection.filter(iterator, context);

    Cortex.forEach(collection, function forEach(value) {
      if (!iterator.apply(context, arguments)) results.push(value);
    });

    return results;
  };


  /**
   * Cortex.map returns the results of applying the iterator to each item in the
   * collection.
   *
   * @param {Mixed} collection
   * @param {Function} iterator
   * @param {Mixed} context
   * @returns {Array}
   * @api public
   */
  Cortex.map = Cortex.collect = function map(collection, iterator, context) {
    var results = [];

    if (!collection) return results;
    if ('map' in collection && typeof collection.map === 'function') {
      return collection.map(iterator, context);
    }

    Cortex.forEach(collection, function forEach(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });

    return results;
  };

  /**
   * MatchesSelector, simple checking if a DOM element matches a certain CSS
   * selector. This method is used internally for Event Listening.
   *
   * @param {String} selector
   * @param {DOM} element
   * @returns {Boolean}
   */
  Cortex.matchesSelector = function matchesSelector(selector, element) {
    if (element.nodeType !== 1) return false;
    if (Cortex._matchesSelector) return Cortex._matchesSelector.call(element, selector);
    return Cortex.Sizzle.matchesSelector(element, selector);
  };

  // attempt to find a native selector
  Cortex._matchesSelector = documentElement.matchesSelector
    || documentElement.mozMatchesSelector
    || documentElement.webkitMatchesSelector
    || documentElement.oMatchesSelector
    || documentElement.msMatchesSelector;

  /**
   * Extend the given object with all the properties of the supplied arguments.
   *
   * @param {Object} obj the base object that needs to be extended with all args
   * @returns {Object} obj
   */
  Cortex.extend = function extend(obj) {
    Cortex.forEach(slice.call(arguments, 1), function iterator(merge) {
      for (var prop in merge) obj[prop] = merge[prop];
    });

    return obj;
  };

  /**
   * Helper function to get the value from an object as property. If the
   * property is a function it will be executed instead.
   *
   * @param {Object} obj
   * @param {String} prop
   * @returns {Mixed}
   */
  Cortex.property = function property(obj, prop) {
    return obj && prop in obj
      ? (typeof obj[prop] === 'function' ? obj[prop]() : obj[prop])
      : null;
  };

  /**
   * Cortex.EventEmitter:
   *
   * Cortex.EventEmitter is heavily influenced by the Node.js EventEmitter
   * module and the regular Observer pattern. It does have some level of
   * compatibility with the Node.js EventEmitter but don't depend on the same
   * behaviour, the API's are just the same.
   *
   * @type {Object}
   */
  var eventsplitter = /\,\s+/;
  var EventEmitter = Cortex.EventEmitter = {
      /**
       * Adds an event listener.
       *
       * @param {String} events space separated list of events to listen on
       * @param {Function} callback
       * @param {Mixed} context
       * @api public
       */
      on: function on(event, callback, context) {
        var events = eventsplitter.test(event)
            ? event.split(eventsplitter)
            : [event];

        this.events = this.events || (this.events = {});

        while (event = events.shift()) {
          if (!event) continue;

          (this.events[event] = this.events[event] || []).push({
              context: context
            , callback: callback
          });
        }

        return this;
      }

      /**
       * Removes attached event listeners. If no arguments are supplied it will
       * remove all the assigned events. If no callback is supplied it will
       * remove all listeners for the specified events. If no context is
       * provided it will remove all event listeners that have the supplied
       * callback.
       *
       * @param {String} event
       * @param {Function} callback
       * @param {Mixed} context
       * @api public
       */
    , off: function off(event, callback, context) {
        var events = eventsplitter.test(event)
            ? event.split(eventsplitter)
            : [event]
          , args = arguments.length
          , handles, handle;

        // short cut, removes all assigned events
        if (!args || !this.events) {
          this.events = {};
          return this;
        }

        /**
         * Helper function to filter out the `this.events` array
         *
         * @param {Function} handle the callback of the event
         * @api private
         */
        function remove(handle) {
          return !(
              handle.callback === callback
            && (!context ? true : handle.context === context)
          );
        }

        while (event = events.shift()) {
          if (!this.events[event] || !event) continue;

          if (!callback) {
            delete this.events[event];
            continue;
          }

          this.events[event] = this.events[event].filter(remove);
        }

        return this;
      }

      /**
       * Call the supplied event listeners with all the supplied arguments.
       *
       * @param {String} event
       * @returns {Boolean} successful emit
       * @api public
       */
    , emit: function emit(event) {
        if (this.suppressed || !this.events) return false;

        var events = eventsplitter.test(event)
            ? event.split(eventsplitter)
            : [event] || Object.keys(this.events)
          , args = slice.call(arguments, 1)
          , called = false;

        /**
         * Helper function that is called on each iteration of matching events.
         *
         * @param {Function} handle
         * @api private
         */
        function call(handle) {
          handle.callback.apply(handle.context, args);
          called = true;
        }

        while (event = events.shift()) {
          if (!this.events[event] || !event) continue;

          this.events[event].forEach(call);
        }

        return called;
      }

      /**
       * Create a listeners that is only called once.
       *
       * @param {String} event
       * @param {Function} callback
       * @param {Mixed} context
       * @api public
       */
    , once: function once(event, handle, context) {
        var self = this;

        /**
         * Create a simple event handler that will remove it self from all
         * assigned events once it's fired.
         *
         * @api private
         */
        function one() {
          self.off(event, one);
          handle.apply(this, arguments);
        }

        one.handle = handle;
        return this.on(event, one, context);
      }

      /**
       * Enable the EventEmitter.
       *
       * @api public
       */
    , enabled: function enabledEmitter() {
        this.suppressed = this.suppressed || 0;
        if (--this.suppressed < 0) this.suppressed = 0;
        return this;
      }

      /**
       * Disable the EventEmitter.
       *
       * @api public
       */
    , disable: function disableEmitter() {
        if (this.suppressed) ++this.suppressed;
        return this;
      }
  };

  // EventEmitter method aliases, to maintain API compatibility with EventEmitter
  EventEmitter.addListener = EventEmitter.on;
  EventEmitter.removeListener = EventEmitter.off;

  /**
   * The Cortex.Structure
   *
   * The Cortex Model is a light-weight implementation of the Backbone.js model
   * and is designed to be used a wrapper for the DOM and for Objects so we have
   * one single universal structure for all operations. Which will hopefully help
   * us to keep our code sane.
   */
  var Structure = Cortex.Structure = function Structure(attributes, options) {
    var defaults;

    // check if the supplied attributes need to be parsed before we can use them.
    attributes = this.parse(attributes);

    // check if we have default values in our structure, so we are sure that
    // these values are always set correctly
    if (defaults = Cortex.property(this, 'defaults')) {
      attributes = Cortex.extend({}, defaults, attributes);
    }

    Cortex.extend(this, options);

    this.history = {};
    this.id = (uniqueId++) + ':' + (+new Date());
    this.attributes = {};

    // Only set attributes if we have them, but also for every other type
    if (!Cortex.is(attributes, 'object') || Object.keys(attributes).length) {
      this.set(attributes, { silent: true });
    }

    if (this.initialize) {
      this.initialize.apply(this, arguments);
    }
  };

  Cortex.extend(Structure.prototype, EventEmitter, {
      /**
       * Get attributes from the structure
       *
       * @param {String} attr
       * @returns {Mixed}
       * @api public
       */
      get: function get(attr) {
        if (!~attr.indexOf('.')) return this.attributes[attr];

        var result = attr
          , structure = this.attributes;

        for (var paths = attr.split('.'), i = 0, length = paths.length; i < length && structure; i++) {
          result = structure[+paths[i] || paths[i]];
          structure = result;
        }

        return result || this.attributes[attr];
      }

      /**
       * See if we have this attribute. We use the #get method for checking as
       * it's easier to extend the structure this way.
       *
       * @param {String} attr
       * @returns {Boolean}
       * @api private
       */
    , has: function has(attr) {
        return !!this.get(attr);
      }

      /**
       * Set new attributes in the structure.
       *
       * @param {String} key
       * @param {Mixed} value
       * @param {Object} options
       * @api public
       */
    , set: function set(key, value, options) {
        var attributes;

        // support bulk updates, by allowing objects to set as a whole
        if (typeof key === 'object') {
          attributes = key;
          options = value;
        } else {
          attributes = {};
          attributes[key] = value;
        }

        options = options || {};
        if (!attributes) return this;
        if (attributes instanceof Structure) attributes = attributes.plain();

        var current = this.attributes
          , cortex = this
          , changed = {}
          , added = {};

        Cortex.forEach(attributes, function update(value, key) {
          if (options.unset) return cortex.remove(key);
          if (key in current && current[key] !== value) changed[key] = true;
          if (!(key in current)) added[key] = true;

          // save the current version of the key in the history, so we can undo
          // changes if needed
          cortex.history[key] = current[key];
          current[key] = value;
        });

        Cortex.forEach(changed, function eachChange(value, key) {
          cortex.emit('changed:' + key, current[key], cortex.attributes[key]);
          cortex.emit('changed', key, current[key], cortex.attributes[key]);
        });

        Cortex.forEach(added, function eachAdded(value, key) {
          cortex.emit('added:' + key, value);
          cortex.emit('added', key, value);
        });

        this.attributes = current;
        return this;
      }

      /**
       * Remove attributes from the structure.
       *
       * @param {String} attr
       * @api public
       */
    , remove: function remove(key) {
        var value = this.attributes[key];

        // remove it from all our internal data structures
        delete this.attributes[key];
        delete this.history[key];

        this.emit('deleted:' + key, value);
        this.emit('deleted', key, value);

        return this;
      }

      /**
       * Clear all attributes of the structure.
       *
       * @api public
       */
    , clear: function clear(options) {
        (options || (options = {})).unset = true;
        return this.set(this.attributes, options);
      }

      /**
       * Create a new clone of the model that is identical to this one.
       *
       * @api public
       */
    , clone: function clone() {
        return new this.constructor(this.attributes);
      }

      /**
       * Get the previous attributes.
       *
       * @param {String} attr attribute that we want the old value from.
       * @api public
       */
    , previous: function previous(attr) {
        return this.history[attr];
      }

      /**
       * Parse converts the given attributes of an Structure to an Object.
       *
       * @param {Object} obj
       * @returns {Object}
       */
    , parse: function parse(obj) {
        return obj;
      }

      /**
       * Transform the Model to a regular plain JavaScript structure.
       *
       * @param {Mixed} index the index of the array or key that it should return
       * @param {Object} options
       * @returns {Object}
       * @api public
       */
    , plain: function plain(index, options) {
          if (typeof index === 'object') {
            options = index;
            index = null;
          }

        return index === undefined ? this.attributes : this.attributes[index];
      }
  });

  /**
   * Cortex.Collection:
   *
   * Provides a standard collection class for a set of Structure.
   *
   * @constructor
   * @param {Array} structures
   * @param {Object} options
   * @api public
   */
  var Collection = Cortex.Collection = function Collection(structures, options) {
    options = options || {};
    Cortex.extend(this, options);

    this.length = 0;
    this.structures = [];
    this.structureId = {};

    if (this.initialize) {
      this.initialize.apply(this, arguments);
    }

    if (structures) this.add(structures, { silent: true });
  };

  Cortex.extend(Collection.prototype, EventEmitter, {
      /**
       * The default structure for a collection is just a plain Structure
       *
       * @type {Cortex.Structure}
       */
      structure: Structure

      /**
       * Transform the collection in a plain object structure.
       *
       * @param {Mixed} index
       * @param {Object} options
       * @returns {Array}
       * @api public
       */
    , plain: function plain(index, options) {
        if (typeof index === 'object') {
          options = index;
          index = null;
        }

        var results = this.structures.map(function plainStructure(structure) {
          return structure.plain(options);
        });

        return index !== undefined ? results[index] : results;
      }

      /**
       * Add a new Structure or an Array of Structures to the collections.
       *
       * @param {Mixed} structures
       * @param {Object} options
       * @api public
       */
    , add: function add(structures, options) {
        structures = Array.isArray(structures) ? structures.slice() : [structures];
        structures = this.parse(structures);

        options = options || {};

        var added = [];

        for (var i = 0, l = structures.length, structure; i < l; i++) {
          structure = this.prepare(structures[i], options);

          // check if we have valid structures
          if (!structure || structure.id in this.structureId) continue;

          // prevent duplicates
          if ('dupe' in this && this.dupe(structure)) continue;

          this.structureId[structure.id] = structure;
          this.structures.push(structure);

          // maintain a list of added items
          added.push(structure);

          // tell the structure that it has been added to a collection
          structure.emit('collection:add', this, options);
        }

        this.length = this.structures.length;
        this.emit('add', added);
        return this;
      }

      /**
       * Removes a structure from the collection.
       *
       * @param {Mixed} structures
       * @param {Object} options
       * @api public
       */
    , remove: function remove(structures, options) {
        structures = Array.isArray(structures) ? structures.slice() : [structures];
        options = options || {};

        var removed = [];

        for (var i = 0, l = structures.length, structure; i < length; i++) {
          structure = this.get(structures[i]);
          if (!structure) continue;

          // remove it from the array
          this.structures.splice(this.structures.indexOf(structures), 1);
          delete this.structureId[structure.id];
          this.length--;

          removed.push(structure);

          structure.emit('collection:remove', this, options);
          structure.collection = undefined;
        }

        this.emit('remove', removed);
        return this;
      }

      /**
       * Checks if the Collection has the given structure.
       *
       * @param {Mixed} obj
       * @param {Object} options
       * @returns {Boolean}
       * @api public
       */
    , has: function has(obj, options) {
        var structures = options && options.plain ? this.plain() : this.structures;
        return !!~structures.indexOf(obj);
      }

      /**
       * Get a structure by id.
       *
       * @param {Mixed} id
       * @returns {Mixed}
       * @api public
       */
    , get: function get(id) {
        return id ? this.structureId[id.id ? id.id : id] : null;
      }

      /**
       * Prepare a structure so it can be used in a Collection context, if we
       * don't receive a Structure instance we are going to generate a new one.
       *
       * @param {Mixed} structure
       * @param {Object} options
       * @api public
       */
    , prepare: function prepare(structure, options) {
        options = options || {};

        if (structure instanceof Structure) {
          structure.collection = this;
        } else {
          options.collection = this;
          structure = new this.structure(structure, options);
        }

        return structure;
      }

      /**
       * Parse the data that is added to the to collection
       *
       * @param {Array} obj
       * @api public
       */
    , parse: function parse(data) {
        return data;
      }
  });

  /**
   * Assign Cortex methods that we want to assign to our collection.
   *
   * @api private
   */
  Cortex.forEach([
      'forEach', 'each'
    , 'map', 'collect'
    , 'filter', 'select'
  ], function forEach(method) {
    Collection.prototype[method] = function generated() {
      return Cortex[method].apply(this, [this.structures].concat(slice.call(arguments, 0)));
    };
  });

  /**
   * Cortex.View:
   *
   * A simple application view handler.
   *
   * @constructor
   * @param {Object} options
   * @api public
   */
  var View = Cortex.View = function View(options) {
    options = options || {};
    this.id = (uniqueId++) + ':' + (+new Date());

    Cortex.extend(this, options);
    this.configure();

    if (this.initialize) {
      this.initialize.apply(this, arguments);
    }
  };

  Cortex.extend(View.prototype, EventEmitter, {
      /**
       * The default selector that we should create if we don't have a Node
       * reference.
       *
       * @type {String}
       * @api public
       */
      selector: 'div'

      /**
       * Event delegated.
       *
       * @type {Object}
       */
    , delegate: {}

      /**
       * Find new elements
       *
       * @param {String} selector
       * @api public
       */
    , $: function $(selector) {
        return this.$el.find(selector);
      }

      /**
       * Provides an alternate syntax for plates which provides you with
       * a chained syntax:
       *
       * this.template('name', data).where('href').has('/bar').insert('newurl');
       *
       * @param {String} name name of the template file
       * @param {Object} data data for the template
       * @returns {Plates.Map} with an toString() method
       */
    , template: function template(name, data) {
        // find the correct HTML template source, see if it's cached or if we
        // need to do a DOM lookup
        var html = name in template && template[name]
          ? template[name]
          : (template[name] = $('#plates-' + name).get('innerHTML'));

        // check if we received data, or default to a potential structure
        data = data || this.structure;
        if (data instanceof Structure || data instanceof Collection) {
          data = data.plain();
        }

        // create a chainable syntax for the Plates template handler by adding
        // a .toString() method. This allows you to just spit it directly in to
        // HTML and it will render as string directly when concatenated with
        // other strings.
        var map = new Plates.Map({ create: true });

        // by creating a toString method on the map, it allows us to pass the
        // map directly in to anything that expects a string and convert it
        // automatically to a proper template
        map.toString = function toString() {
          // prevent other kinds of invocations
          delete map.toString;

          return Plates.bind(html, data, this);
        };

        return map;
      }

      /**
       * Configure the view and ensure that all elements and hooks are in place.
       *
       * @api private
       */
    , configure: function configure() {
        // setup the internal element
        this.$el = $(this.selector);
        this.el = this.$el.plain();

        // get the selectors of the view so we can make sure that all delegated
        // events are only trigged within this selector
        var roots = typeof this.selector === 'string'
          ? this.selector.split(/[\s+]?\,[\s+]?/)
          : [];

        // assign event delegation
        Cortex.forEach(roots, function rooting(root) {
          root = root ? root + ' ' : '';

          Cortex.forEach(this.delegate, function delegate(handle, selector) {
            if (!this[handle] || typeof this[handle] !== 'function') {
              throw new Error('Undefined callback for delegated event ' + selector);
            }

            var query = selector.split(/^(\S+)\s*(.*)$/);

            // CSS selectors that are prefixed with a `< ` will not be prefixed with
            // the selector of the view and are allowed to be listen to the full
            // document
            selector = query[2].charAt(0) === '<' ? query[2].slice(2) : root + query[2];

            Events.add(query[1], selector, this[handle], this);
          }, this);
        }, this);
      }
  });

  /**
   * Self propagating extend function that Cortex uses.
   *
   * @param {Object} protoProps
   * @param {Object} classProps
   * @api public
   */
  Structure.extend = Collection.extend = View.extend = function extend(protoProps, classProps) {
    var child = Cortex.inherits(this, protoProps, classProps);

    child.extend = this.extend;
    return child;
  };

  /**
   * @copyright backbone.js
   * Helper function to correctly set up the prototype chain, for subclasses.
   * Similar to `goog.inherits`, but uses a hash of prototype properties and
   * class properties to be extended.
   */
  function Ctor() {}
  Cortex.inherits = function inherits(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function child(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    Cortex.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    Ctor.prototype = parent.prototype;
    child.prototype = new Ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) Cortex.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) Cortex.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  /**
   * Cortex.Node:
   *
   * Cortex.Node is an DOM interface allows us to create a universal interface
   * between the DOM and our application code. This is where can add support for
   * different DOM operations such as a `css` method etc.
   *
   * @constructor
   * @api private
   */
  var Node = Cortex.Node = Structure.extend({
      initialize: function initialize(attributes) {
        this.attributes = typeof attributes === 'string'
          ? this.factory(attributes)
          : attributes;
      }

      /**
       * Get attributes attributes from the given Node instance.
       *
       * @param {String} attr
       * @returns {Mixed}
       * @api public
       */
    , get: function get(attr) {
        var attributes = this.attributes
          , attribute;

        if (attr in attributes && attributes[attr]) return attributes[attr] || '';

        attribute = attributes.getAttribute(attr);
        if (attribute) return attribute;

        // check for HTML5 dataset support or fallback to getAttribute hax
        if ('dataset' in attributes && typeof attributes.dataset === 'object' && attr in attributes.dataset) {
          return attributes.dataset[attr] || '';
        }

        return attributes.getAttribute('data-' + attr) || '';
      }

      /**
       * Set's new attributes on the Node instance, if an element doesn't
       * support it, it should should really be added as data-attribute.
       */
    , set: function set(key, value, options) {
        var attributes;

        // special case for Node's
        if (typeof key === 'object' && 'nodeType' in key && key.nodeType === 1) {
          this.attributes = key;
          return this;
        }

        // support bulk updates, by allowing objects to set as a whole
        if (typeof key === 'object') {
          attributes = key;
          options = value;
        } else {
          attributes = {};
          attributes[key] = value;
        }

        options = options || {};
        if (!attributes) return this;
        if (attributes instanceof Structure) attributes = attributes.plain();

        var current = this.attributes
          , cortex = this
          , changed = {}
          , added = {};

        Cortex.forEach(attributes, function update(value, key) {
          if (options.unset) return cortex.remove(key);

          // determin if this a change or a addition
          var has = key in current
            , attr = current.hasAttribute('data-' + key)
            , currentvalue = cortex.get(key);

          if (has || attr && currentvalue !== value) changed[key] = true;
          if (!has && !attr) added[key] = true;

          // save the current version of the key in the history, so we can undo
          // changes if needed
          cortex.history[key] = currentvalue;

          if (has) {
            current[key] = value;
          } else {
            // we cannot set the data using the dataset property because it can
            // transform the key in to something completey different than you
            // added.. restoreId -> restore-id for example
            current.setAttribute('data-' + key, value);
          }
        });

        Cortex.forEach(changed, function eachChange(value, key) {
          cortex.emit('changed:' + key, current[key], cortex.attributes[key]);
          cortex.emit('changed', key, current[key], cortex.attributes[key]);
        });

        Cortex.forEach(added, function eachAdded(value, key) {
          cortex.emit('added:' + key, value);
          cortex.emit('added', key, value);
        });

        this.attributes = current;
        return this;
      }

      /**
       * Generate an actual DOM element from a string.
       *
       * @param {String} dom
       * @returns {DOM}
       * @api public
       */
    , factory: function factory(dom) {
        var div = document.createElement('div');
        div.innerHTML = dom;

        return div.firstChild;
      }

      /**
       * Destroy the structure.
       *
       * @returns {Boolean} successful removement
       * @api public
       */
    , destroy: function remove() {
        this.attributes.parentNode.removeChild(this.attributes);
        return true;
      }

      /**
       * This is where the syntax sugar starts. If you want to interact with the
       * DOM in any way this is the spot where you would want to be.
       *
       * Make sure that every single function that is specified here returns
       * `this` so we can chain different methods together.
       */

      /**
       * Show the DOM element.
       *
       * @api public
       */
    , show: function show() {
        this.attributes.style.display = this.attributes.style.display === 'none'
          ? ''
          : 'block';

        return this;
      }

      /**
       * Hide the DOM element.
       *
       * @api public
       */
    , hide: function hide() {
        this.attributes.style.display = 'none';
        return this;
      }

      /**
       * Added classNames
       *
       * @param {String} className
       * @api public
       */
    , addClass: function addClass(className) {
        var current = this.attributes.className
          , currentClasses = current.split(' ')
          , classes = className.split(' ')
          , i = classes.length;

        while (i--) {
          if (current && ~currentClasses.indexOf(classes[i])) continue;
          current += ' ' + classes[i];
        }

        this.attributes.className = current;
        return this;
      }

      /**
       * remove className.
       *
       * @param {String} className
       * @api private
       */
    , removeClass: function removeClass(className) {
        var current = this.attributes.className
          , classes = className.split(' ')
          , i = classes.length;

        while (i--) {
          current = current.replace(
              new RegExp('[\\s*]?\\b' + classes[i] + '\\b', 'g')
            , ''
          );
        }

        this.attributes.className = current;
        return this;
      }
  });

  /**
   * Cortex.Nodelist:
   *
   * A simple representation of a Node collection.
   *
   * @constructor
   * @api public
   */
  var Nodelist = Cortex.Nodelist = Collection.extend({
      /**
       * The default Structure that should be created.
       *
       * @type {Cortex.Node}
       */
      structure: Cortex.Node

      /**
       * The selector that was used to generate this Nodelist
       *
       * @type {String}
       */
    , selector: ''

      /**
       * Generate a new Nodelist instance with the matching Nodes.
       *
       * @param {String} selector
       * @returns {Cortext.Nodelist} a new Nodelist
       * @api public
       */
    , find: function find(selector) {
        var nodes = [];

        // find all matching elements
        Cortex.forEach(this.plain(), function plainNodes(node) {
          var matches = $(selector, node);

          if (matches.length) Array.prototype.push.apply(nodes, matches.plain());
        });

        // now that we have all fetched all elements, return a new Nodelist
        // instance that holds all of these elements
        return new Nodelist(nodes, {
            selector: this.selector + ' ' + selector
          , wrapper: this
        });
      }

      /**
       * End a chained .find() method by returning it's wrapping parent Nodelist
       *
       * @api public
       */
    , end: function end() {
        return this.wrapper || this;
      }

      /**
       * Find the parent of the element.
       *
       * @param {String} selector
       * @returns {Cortex.NodeList}
       * @api public
       */
    , parent: function parent(selector) {
        var nodes = []
          , plain = this.plain();

        if (selector) {
          Cortex.forEach(plain, function parents(node) {
            var parent = node.parentNode;

            while (parent) {
              if (Cortex.matchesSelector(selector, parent)) {
                return nodes.push(parent);
              }

              parent = parent.parentNode;
            }
          });
        } else {
          // find all matching elements
          Cortex.forEach(plain, function plainNodes(node) {
            nodes.push(node.parentNode);
          });
        }

        // now that we have all fetched all elements, return a new Nodelist
        // instance that holds all of these elements
        return new Nodelist(nodes, {
            selector: selector || this.selector
          , wrapper: this
        });
      }
  });

  /**
   * Generate proxy methods
   *
   * @TODO get/set/remove will probably override methods for the collection, so
   * we need to figure out a way around that.
   * @api private
   */
  Cortex.forEach([
    'show', 'hide', 'addClass', 'removeClass',
    'get', 'set', 'destroy'
  ], function generateProxy(method) {
    Nodelist.prototype[method] = function proxy() {
      var args = slice.call(arguments, 0)
        , chained = false
        , returns = [];

      this.forEach(function each(struct) {
        var returned = struct[method].apply(struct, args);

        // Detect if we are dealing with chained values here
        if (!chained) chained = returned === struct;

        // Make sure we return the values, even emptry strings or booleans
        if (returned !== undefined && returned !== struct) returns.push(returned);
      });

      // Short hand for chained values
      if (chained) return this;

      if (!returns.length) return undefined;
      if (returns.length === 1) return returns[0];

      return returns;
    };
  });

  /**
   * Cortex.Events:
   *
   * Cortex.Events takes care of all the DOM event handling. All events DOM
   * events eventually bubble down to the documentElement where they are
   * captured and checked against CSS selectors for events that are listening.
   */
  var Events = Cortex.Events = {
        /**
         * Simple dictionary that contains all our listeners.
         *
         * @type {Object}
         * @api private
         */
        listeners: {}

        /**
         * Add a new event listener.
         *
         * @param {String} type event type, click, dbclick, keydown etc.
         * @param {String} selectors CSS3 selector that matches the element
         * @param {Function} callback
         * @param {Function} context
         * @api public
         */
      , add: function add(type, selector, callback, context) {
          // if we already have an emitter, start listening
          if (this.listeners[type]) return this.listeners[type].on(selector, callback, context);

          // setup a new EventEmitter instance
          this.listeners[type] = Cortex.extend({
              type: type
            , listener: documentElement.addEventListener(
                  type
                , this.process.bind(undefined, type)
                , true // needs to be set to true, or blur events won't work
              )
          }, EventEmitter);

          // assign the event listener
          return this.listeners[type].on(selector, callback, context);
        }

        /**
         * Remove the listeners again.
         *
         * @param {String} type event type, click, dbclick, keydown etc.
         * @param {String} selectors CSS3 selector that matches the element
         * @param {Function} callback
         * @api public
         */
      , remove: function remove(type, selector, callback) {
          if (!this.listeners[type]) return this;
          this.listeners[type].off(selector, callback);
        }

        /**
         * The function that processes events.
         *
         * @param {String} type event type
         * @param {Event} e DOM event
         * @api private
         */
      , process: function process(type, e) {
          e = e || window.event;

          var element = e.target
            , listeners = Events.listeners[type];

          // make sure that we still have listeners
          if (!type) return;

          // establish a list of possible dom matches by getting all the parent
          // elements of the clicked event
          var selectors = Object.keys(listeners.events)
            , nodes = [element]
            , node = element
            , matches = {}
            , parent;

          while (node = node.parentNode) {
            nodes.push(node);
          }

          // make sure that we get list of matching DOM nodes first before we
          // start emitting the events for the selectors as the called
          // EventEmitter can actually modify the state of the current DOM node
          // and make it pass for other selectors.
          Cortex.forEach(selectors, function forEach(selector) {
            for (var i = 0, l = nodes.length; i < l; i++) {
              if (Cortex.matchesSelector(selector, nodes[i])) {
                matches[selector] = nodes[i];
                return;
              }
            }
          });

          Cortex.forEach(matches, function forEachMatch(node, selector) {
            // We cannot re-set the correct target node as `e.target` as the
            // property is a `getter` only, and will throw errors in FireFox
            e.element = node;
            listeners.emit(selector, e);
          });
        }
    };

  /**
   * Cortex.push() allows us to load library files comply async, if Cortex does
   * not yet exist in the global scope it would be set to an array where the
   * functions will be pushed. So when this "main" library is loaded in, it will
   * search for all old Cortex instances and execute it.
   *
   * @param {String} name the name of the library
   * @param {Mixed} library either a string or a function.
   * @api public
   */
  Cortex.push = function push(name, library) {
    if (name in Cortex.push) return this;

    Cortex.push[name] = typeof library === 'function'
     ? library(Cortex)
     : (new Function('Cortex', library))(Cortex);

    return this;
  };

  /**
   * Simple CSS3 selector engine targeted for the high-end browsers. By using
   * our own interface it's relatively easy to hook in optional support for
   * different browsers.
   *
   * @param {String} selector
   * @param {DOM} context optional context
   * @returns {Cortex.Nodelist}
   * @api public
   */
  Cortex.find = root.$ = function find(selector, context) {
    context = context || document;

    var nodes = []
      , simple = /^[\#\.\w]?[\w\-]+$/.test(selector)
      , result
      , charAt;

    // simple selector optimization, because we are bad-ass like that
    if (typeof selector === 'string') {
      if (simple) {
        charAt = selector.charAt(0);

        // handle direct id lookups
        if (charAt === '#') {
          result = context.getElementById(selector.slice(1));
          if (result) nodes.push(result);

        // className lookups
        } else if (charAt === '.') {
          nodes = slice.call(context.getElementsByClassName(selector.slice(1)), 0);

        // it would have been a regular tag name
        } else {
          nodes = slice.call(context.getElementsByTagName(selector), 0);
        }
      } else if (
          selector.charAt(0) === '<'
        && selector.charAt(selector.length - 1) === '>'
      ) {
        nodes.push(selector);
      } else {
        nodes = Cortex.Sizzle(selector, context);
      }
    } else {
      nodes.push(selector);
      selector = selector.nodeName ? selector.nodeName.toLowerCase() : selector;
    }

    return new Nodelist(nodes, { selector: selector });
  };

  /**
   * Application framework bootstrapper. It scans the current document for
   * cerebral/cortex script types and parses them as JSON which will be used as
   * application configuration.
   *
   * @param {Function} fn the callback for when the cortex has become active
   * @api public
   */
  Cortex.active = function active(fn) {
    if (Cortex.configured) {
      fn.call(Cortex, null, Cortex.cerebral);
      return this;
    }

    Cortex.active.on('loaded', function loaded() {
      // the initial configuration object
      var configuration = {};

      Cortex.find('script[type="cerebral/cortex"]').forEach(function each(node) {
        var content = node.get('innerHTML');
        if (!content) return;

        Cortex.extend(
            configuration
            // transform the content's of the script tag to plain JavaScript so we
            // can use it as a configuration object
          , (new Function('return ' + content.trim())())
        );
      });

      Cortex.cerebral = Cortex.configuration = configuration;
      Cortex.configured = true;

      fn.call(Cortex, null, configuration);
    });

    return this;
  };

  // Make sure it inherits from EventEmitter so we can have it listen for loaded
  // events.
  Cortex.extend(Cortex.active, EventEmitter);

  /**
   * Create a new Cortex application once everything is loaded correctly.
   *
   * Options
   *  - once: [name] defer initialization till Cortex.active.once is triggered
   *
   * @param {String} name name of the application
   * @param {Function} instance constructor of the application
   * @param {Object} options optional options for the app.
   * @api public
   */
  Cortex.app = function app(name, Instance, options) {
    name = name.toLowerCase();

    // are we setting or getting
    if (arguments.length === 1) return app[name];
    if (app[name]) return this;

    Cortex.active(function (err, configuration) {
      if (app[name] || err) return;

      options = Cortex.extend(options || {}, configuration[name] || configuration);
      var instance = app[name] = options && options.once
        ? Cortex.active.once(options.once, new Instance(options))
        : new Instance(options);

      // notify the application that it has been loaded as a cortex app.
      if ('emit' in instance) instance.emit('cortex:app', options);
    });

    return this;
  };

  // EcmaScript methods used in this application, and should be polyfilled for
  // complete cross browser compatibility:
  //
  // - Object.keys()
  // - Array.indexOf()
  // - Array.filter()
  // - Array.map()
  // - Array.isArray()
  // - String.trim()
  // - Function.bind()

  /**
   * Importing third-party libraries so they are contained within our `Cortex`
   * namespace. The reqwest library likes to export to the global namespace
   * unless it detects a AMD define wrapper.. So we are going to emulate that
   * first.
   *
   * @param {String} name
   * @param {Function} fn
   * @api private
   */
  function define(name, fn) {
    if (typeof name === 'function') {
      fn = name;
      name = define.importing;
    }

    Cortex[name] = fn();
  }

  define.importing = 'undefined';
  define.amd = true;

  // [square] @import "./vendor/plates.js"
  define.importing = 'reqwest';
  // [square] @import "./vendor/reqwest.js"
  define.importing = 'Sizzle';
  // [square] @import "./vendor/sizzle.js"

  // Make sure that it's still accessible from the outside, and rename them to
  // sensible defaults..
  Cortex.Plates = Plates;
  Cortex.request = Cortex.reqwest;

  // Add our polyfills
  // [square] @import "./lib/cortex.polyfill.js"

  // Functionality that depends on the Cortex module can be async and lazy
  // loaded using a small wrapper, we need to check if these modules where
  // loaded before we created the Cortex library.
  //
  // THIS SHOULD BE LAST PIECE OF CODE OR THE WHOLE UNIVERSE WILL BLOW UP WITH
  // JS ERRORS
  if (Array.isArray(_Cortex) && _Cortex.length % 2 === 0) {
    for (var i = 0, l = _Cortex.length; i < l; i++) {
      Cortex.push(_Cortex[i], _Cortex[++i]);
    }
  }

  // Set the current readyState of the Core
  Cortex.readyState = 'loading';

  document.addEventListener('cortex', function () {
    Cortex.readyState = 'loaded';
    Cortex.active.emit('loaded');
  }, false);
}(this));
