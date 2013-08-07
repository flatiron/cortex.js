/* [square] Bundle: /lib/cortex.js */
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
        if (added.length) this.emit('add', added);
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
       * Get a structure by index from structures.
       *
       * @param {Number} i
       * @returns {Mixed}
       * @api public
       */
    , index: function index(i) {
        return i ? this.structures[i] : null;
      }

      /**
       * Get the last structure added to structures.
       *
       * @returns {Mixed}
       * @api public
       */
    , last: function last() {
        return this.structures[this.length - 1];
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
      var instance = app[name] = new Instance(options);

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

  /* [square] Directive: /home/swaagie/projects/cortex/node_modules/plates/lib/plates.js */
var Plates = (typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof exports !== 'undefined') ? exports : {};

!function(exports, env, undefined) {
  "use strict";

  //
  // Cache variables to increase lookup speed.
  //
  var _toString = Object.prototype.toString;

  //
  // Polyfill the Array#indexOf method for cross browser compatibility.
  //
  [].indexOf || (Array.prototype.indexOf = function indexOf(a, b ,c){
    for (
      c = this.length , b = (c+ ~~b) % c;
      b < c && (!(b in this) || this[b] !==a );
      b++
    );

    return b^c ? b : -1;
  });

  //
  // Polyfill Array.isArray for cross browser compatibility.
  //
  Array.isArray || (Array.isArray = function isArray(a) {
    return _toString.call(a) === '[object Array]';
  });

  //
  // ### function fetch(data, mapping, value, key)
  // #### @data {Object} the data that we need to fetch a value from
  // #### @mapping {Object} The iterated mapping step
  // #### @tagbody {String} the tagbody we operated against
  // #### @key {String} optional key if the mapping doesn't have a dataKey
  // Fetches the correct piece of data
  //
  function fetch(data, mapping, value, tagbody, key) {
    key = mapping.dataKey || key;

    //
    // Check if we have data manipulation or filtering function.
    //
    if (mapping.dataKey && typeof mapping.dataKey === 'function') {
      return mapping.dataKey(data, value || '', tagbody || '', key);
    }

    //
    // See if we are using dot notation style
    //
    if (!~key.indexOf('.')) return data[key];

    var result = key
      , structure = data;

    for (var paths = key.split('.'), i = 0, length = paths.length; i < length && structure; i++) {
      result = structure[+paths[i] || paths[i]];
      structure = result;
    }

    return result || data[key];
  }

  //
  // compileMappings
  //
  // sort the mappings so that mappings for the same attribute and value go consecutive
  // and inside those, those that change attributes appear first.
  //
  function compileMappings(oldMappings) {
    var mappings = oldMappings.slice(0);

    mappings.sort(function(map1, map2) {
      if (!map1.attribute) return 1;
      if (!map2.attribute) return -1;

      if (map1.attribute !== map2.attribute) {
        return map1.attribute < map2.attribute ? -1 : 1;
      }
      if (map1.value !== map2.value) {
        return map1.value < map2.value ? -1 : 1;
      }
      if (! ('replace' in map1) && ! ('replace' in map2)) {
        throw new Error('Conflicting mappings for attribute ' + map1.attribute + ' and value ' + map1.value);
      }
      if (map1.replace) {
        return 1;
      }
      return -1;
    });

    return mappings;
  }

//
// Matches a closing tag to a open tag
//
function matchClosing(input, tagname, html) {
  var closeTag = '</' + tagname + '>',
      openTag  = new RegExp('< *' + tagname + '( *|>)', 'g'),
      closeCount = 0,
      openCount = -1,
      from, to, chunk
      ;
  
  from = html.search(input);
  to = from;

  while(to > -1 && closeCount !== openCount) {
    to = html.indexOf(closeTag, to);
    if (to > -1) {
      to += tagname.length + 3;
      closeCount ++;
      chunk = html.slice(from, to);
      openCount = chunk.match(openTag).length;
    }
  }
  if (to === -1) {
    throw new Error('Unmatched tag ' + tagname + ' in ' + html)
  }

  return chunk;
}

  var Merge = function Merge() {};
  Merge.prototype = {
    nest: [],

    tag: new RegExp([
      '<',
      '(/?)', // 2 - is closing
      '([-:\\w]+)', // 3 - name
      '((?:[-\\w]+(?:', '=',
      '(?:\\w+|["|\'](?:.*)["|\']))?)*)', // 4 - attributes
      '(/?)', // 5 - is self-closing
      '>'
    ].join('\\s*')),

    //
    // HTML attribute parser.
    //
    attr: /([\-\w]*)\s*=\s*(?:["\']([\-\.\w\s\/:;&#]*)["\'])/gi,

    //
    // In HTML5 it's allowed to have to use self closing tags without closing
    // separators. So we need to detect these elements based on the tag name.
    //
    selfClosing: /area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr/,

    //
    // ### function hasClass(str, className)
    // #### @str {String} the class attribute
    // #### @className {String} the className that the classAttribute should contain
    //
    // Helper function for detecting if a class attribute contains the className
    //
    hasClass: function hasClass(str, className) {
      return ~str.split(' ').indexOf(className);
    },

    //
    // ### function iterate(html, value, components, tagname, key)
    // #### @html {String} peice of HTML
    // #### @value {Mixed} iterateable object with data
    // #### @components {Array} result of the this.tag regexp execution
    // #### @tagname {String} the name of the tag that we iterate on
    // #### @key {String} the key of the data that we need to extract from the value
    //
    // Iterate over over the supplied HTML.
    //
    iterate: function iterate(html, value, components, tagname, key, map) {

      var output  = '',
          segment = matchClosing(components.input, tagname, html),
          data = {}
          ;

      // Is it an array?
      if (Array.isArray(value)) {
        // Yes: set the output to the result of iterating through the array
        for (var i = 0, l = value.length; i < l; i++) {
          // If there is a key, then we have a simple object and
          // must construct a simple object to use as the data
          if (key) {
            data[key] = value[i];
          } else {
            data = value[i];
          }

          output += this.bind(segment, data, map);
        }

        return output;
      } else if (typeof value === 'object') {
        // We need to refine the selection now that we know we're dealing with a
        // nested object
        segment = segment.slice(components.input.length, -(tagname.length + 3));
        return output += this.bind(segment, value, map);
      }

      return value;
    },

    //
    // ### function bind(html, data, map)
    // #### @html {String} the template that we need to modify
    // #### @data {Object} data for the template
    // #### @map {Mapper} instructions for the data placement in the template
    // Process the actual template
    //
    bind: function bind(html, data, map) {
      if (Array.isArray(data)) {
        var output = '';

        for (var i = 0, l = data.length; i<l; i++) {
          output += this.bind(html, data[i], map);
        }

        return output;
      }

      html = html || '';
      data = data || {};

      var that = this;

      var openers = 0,
          remove = 0,
          components,
          attributes,
          mappings = map && compileMappings(map.mappings),
          intag = false,
          tagname = '',
          isClosing = false,
          isSelfClosing = false,
          selfClosing = false,
          matchmode = false,
          createAttribute = map && map.conf && map.conf.create,
          closing,
          tagbody;

      var c,
          buffer = '',
          left;

      for (var i = 0, l = html.length; i < l; i++) {
        c = html.charAt(i);

        //
        // Figure out which part of the HTML we are currently processing. And if
        // we have queued up enough HTML to process it's data.
        //
        if (c === '!' && intag && !matchmode) {
          intag = false;
          buffer += html.slice(left, i + 1);
        } else if (c === '<' && !intag) {
          closing = true;
          intag = true;
          left = i;
        } else if (c === '>' && intag) {
          intag = false;
          tagbody = html.slice(left, i + 1);
          components = this.tag.exec(tagbody);

          if(!components) {
            intag = true;
            continue;
          }

          isClosing = components[1];
          tagname = components[2];
          attributes = components[3];
          selfClosing = components[4];
          isSelfClosing = this.selfClosing.test(tagname);

          if (matchmode) {
            //
            // and its a closing.
            //
            if (!!isClosing) {
              if (openers <= 0) {
                matchmode = false;
              } else {
                --openers;
              }
            } else if (!isSelfClosing) {
              //
              // and its not a self-closing tag
              //
              ++openers;
            }
          }

          if (!isClosing && !matchmode) {
            //
            // if there is a match in progress and
            //
            if (mappings && mappings.length > 0) {
              for (var ii = mappings.length - 1; ii >= 0; ii--) {
                var setAttribute = false
                  , mapping = mappings[ii]
                  , shouldSetAttribute = mapping.re && attributes.match(mapping.re);

                //
                // check if we are targetting a element only or attributes
                //
                if ('tag' in mapping && !this.attr.test(tagbody) && mapping.tag === tagname) {
                  tagbody = tagbody + fetch(data, mapping, '', tagbody);
                  continue;
                }

                tagbody = tagbody.replace(this.attr, function(str, key, value, a) {
                  var newdata;

                  if (shouldSetAttribute && mapping.replace !== key || remove) {
                    return str;
                  } else if (shouldSetAttribute || typeof mapping.replacePartial1 !== 'undefined') {
                    setAttribute = true;

                    //
                    // determine if we should use the replace argument or some value from the data object.
                    //
                    if (typeof mapping.replacePartial2 !== 'undefined') {
                      newdata = value.replace(mapping.replacePartial1, mapping.replacePartial2);
                    } else if (typeof mapping.replacePartial1 !== 'undefined' && mapping.dataKey) {
                      newdata = value.replace(mapping.replacePartial1, fetch(data, mapping, value, tagbody, key));
                    } else {
                      newdata = fetch(data, mapping, value, tagbody, key);
                    }

                    return key + '="' + (newdata || '') + '"';
                  } else if (!mapping.replace && mapping.attribute === key) {
                    if (
                      mapping.value === value ||
                      that.hasClass(value, mapping.value ||
                      mappings.conf.where === key) ||
                      (_toString.call(mapping.value) === '[object RegExp]' &&
                        mapping.value.exec(value) !== null)
                    ) {
                      if (mapping.remove) {
                        //
                        // only increase the remove counter if it's not a self
                        // closing element. As matchmode is suffectient to
                        // remove tose
                        //
                        if (!isSelfClosing) remove++;
                        matchmode = true;
                      } else if (mapping.plates) {
                        var partial = that.bind(
                            mapping.plates
                          , typeof mapping.data === 'string' ? fetch(data, { dataKey: mapping.data }) : mapping.data || data
                          , mapping.mapper
                        );

                        buffer += tagbody + that.iterate(html, partial, components, tagname, undefined, map);
                        matchmode = true;
                      } else {
                        var v = newdata = fetch(data, mapping, value, tagbody, key);
                        newdata = tagbody + newdata;

                        if (Array.isArray(v)) {
                          newdata = that.iterate(html, v, components, tagname, value, map);
                          // If the item is an array, then we need to tell
                          // Plates that we're dealing with nests
                          that.nest.push(tagname);
                        } else if (typeof v === 'object') {
                          newdata = tagbody + that.iterate(html, v, components, tagname, value, map);
                        }

                        buffer += newdata || '';
                        matchmode = true;
                      }
                    }
                  }

                  return str;
                });

                //
                // Do we need to create the attributes if they don't exist.
                //
                if (createAttribute && shouldSetAttribute && !setAttribute) {
                  var spliced = selfClosing ? 2 : 1
                    , close = selfClosing ? '/>': '>'
                    , left = tagbody.substr(0, tagbody.length - spliced);

                  if (left[left.length - 1] === ' ') {
                    left = left.substr(0, left.length - 1);

                    if (selfClosing) {
                      close = ' ' + close;
                    }
                  }

                  tagbody = [
                    left,
                    ' ',
                    mapping.replace,
                    '="',
                    fetch(data, mapping),
                    '"',
                    close
                  ].join('');
                }
              }
            } else {
              //
              // if there is no map, we are just looking to match
              // the specified id to a data key in the data object.
              //
              tagbody.replace(this.attr, function (attr, key, value, idx) {
                  if (key === map && map.conf.where || 'id' && data[value]) {
                    var v = data[value],
                        nest = Array.isArray(v),
                        output = (nest || typeof v === 'object') ? that.iterate(html, v, components, tagname, value, map) : v;

                    // If the item is an array, then we need to tell
                    // Plates that we're dealing with nests
                    if (nest) { that.nest.push(tagname); }

                    buffer += nest ? output : tagbody + output;
                    matchmode = true;
                  }
                }
              );
            }
          }

          //
          // if there is currently no match in progress
          // just write the tagbody to the buffer.
          //
          if (!matchmode && that.nest.length === 0) {
            if (!remove) buffer += tagbody;

            if (remove && !!isClosing) --remove;
          } else if (!matchmode && that.nest.length) {
              this.nest.pop();
          }
        } else if (!intag && !matchmode) {
          //
          // currently not inside a tag and there is no
          // match in progress, we can write the char to
          // the buffer.
          //
          if (!remove) buffer += c;
        }
      }
      return buffer;
    }
  };

  //
  // ### function Mapper(conf)
  // #### @conf {Object} configuration object
  // Constructor function for the Mapper instance that is responsible for
  // providing the mapping for the data structure
  //
  function Mapper(conf) {
    if (!(this instanceof Mapper)) { return new Mapper(conf); }

    this.mappings = [];
    this.conf = conf || {};
  }

  //
  // ### function last(newitem)
  // #### @newitem {Boolean} do we need to add a new item to the mapping
  // Helper function for adding new attribute maps to a Mapper instance
  //
  function last(newitem) {
    if (newitem) {
      this.mappings.push({});
    }

    var m = this.mappings[this.mappings.length - 1];

    if (m && m.attribute && m.value && m.dataKey && m.replace) {
      m.re = new RegExp(m.attribute + '=([\'"]?)' + m.value + '\\1');
    } else if (m) {
      delete m.re;
    }

    return m;
  }

  //
  // Create the actual chainable methods: where('class').is('foo').insert('bla')
  //
  Mapper.prototype = {
    //
    // ### function replace(val1, val2)
    // #### @val1 {String|RegExp} The part of the attribute that needs to be replaced
    // #### @val2 {String} The value it should be replaced with
    //
    replace: function replace(val1, val2) {
      var l = last.call(this);
      l.replacePartial1 = val1;
      l.replacePartial2 = val2;
      return this;
    },

    //
    // ### function use(val)
    // #### @val {String} A string that represents a key.
    // Data will be inserted into the attribute that was specified in the
    // `where` clause.
    //
    use: function use(val) {
      last.call(this).dataKey = val;
      return last.call(this) && this;
    },

    //
    // ### function where(val)
    // #### @val {String} an attribute that may be found in a tag
    // This method will initiate a clause. Once a clause has been established
    // other member methods will be chained to each other in any order.
    //
    where: function where(val) {
      last.call(this, true).attribute = val;
      return last.call(this) && this;
    },

    //
    // ### function class(val)
    // #### @val {String} a value that may be found in the `class` attribute of a tag
    // the method name should be wrapped in quotes or it will throw errors in IE.
    //
    'class': function className(val) {
      return this.where('class').is(val);
    },

    //
    // ### function tag(val)
    // #### @val {String} the name of the tag should be found
    //
    tag: function tag(val) {
      last.call(this, true).tag = val;
      return this;
    },

    //
    // ### function is(val)
    // #### @val {string} The value of the attribute that was specified in the
    // `where` clause.
    //
    is: function is(val) {
      last.call(this).value = val;
      return last.call(this) && this;
    },

    //
    // ### function has(val)
    // #### @val {String|RegExp} The value of the attribute that was specified
    // in the `where` clause.
    //
    has: function has(val) {
      last.call(this).value = val;
      this.replace(val);
      return last.call(this) && this;
    },

    //
    // ### function insert(val)
    // #### @val {String} A string that represents a key. Data will be inserted
    // in to the attribute that was specified in the `where` clause.
    //
    insert: function insert(val) {
      var l = last.call(this);
      l.replace = l.attribute;
      l.dataKey = val;
      return last.call(this) && this;
    },

    //
    // ### function as(val)
    // #### @val {String} A string that represents an attribute in the tag.
    // If there is no attribute by that name name found, one may be created
    // depending on the options that where passed in the `Plates.Map`
    // constructor.
    //
    as: function as(val) {
      last.call(this).replace = val;
      return last.call(this) && this;
    },

    //
    // ### function remove()
    // This will remove the element that was specified in the `where` clause
    // from the template.
    //
    remove: function remove() {
      last.call(this).remove = true;
      return last.call(this, true);
    },

    //
    // ### function append(plates, data, map)
    // #### @plates {String} Template or path/id of the template
    // #### @data {Object|String} data for the appended template
    // #### @map {Plates.Map} mapping for the data
    //
    append: function append(plates, data, map) {
      var l = last.call(this);

      if (data instanceof Mapper) {
        map = data;
        data = undefined;
      }

      // If the supplied plates template doesn't contain any HTML it's most
      // likely that we need to import it. To improve performance we will cache
      // the result of the file system.
      if (!/<[^<]+?>/.test(plates) && !exports.cache[plates]) {
        // figure out if we are running in Node.js or a browser
        if ('document' in env && 'getElementById' in env.document) {
          exports.cache[plates] = document.getElementById(plates).innerHTML;
        } else {
          exports.cache[plates] = require('fs').readFileSync(
            require('path').join(process.cwd(), plates),
            'utf8'
          );
        }
      }

      l.plates = exports.cache[plates] || plates;
      l.data = data;
      l.mapper = map;

      return last.call(this, true);
    }
  };

  //
  // Provide helpful aliases that well help with increased compatibility as not
  // all browsers allow the Mapper#class prototype (IE).
  //
  Mapper.prototype.className = Mapper.prototype['class'];

  //
  // Aliases of different methods.
  //
  Mapper.prototype.partial = Mapper.prototype.append;
  Mapper.prototype.to = Mapper.prototype.use;

  //
  // Expose a simple cache object so people can clear the cached partials if
  // they want to.
  //
  exports.cache = {};

  //
  // Expose the Plates#bind interface.
  //
  exports.bind = function bind(html, data, map) {
    var merge = new Merge();
    return merge.bind(html, data, map);
  };

  //
  // Expose the Mapper.
  //
  exports.Map = Mapper;
}(Plates, this);
  define.importing = 'reqwest';
  /* [square] Directive: /home/swaagie/projects/cortex/node_modules/reqwest/reqwest.js */
/*!
  * Reqwest! A general purpose XHR connection manager
  * (c) Dustin Diaz 2013
  * https://github.com/ded/reqwest
  * license MIT
  */
!function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
}('reqwest', this, function () {

  var win = window
    , doc = document
    , twoHundo = /^20\d$/
    , byTag = 'getElementsByTagName'
    , readyState = 'readyState'
    , contentType = 'Content-Type'
    , requestedWith = 'X-Requested-With'
    , head = doc[byTag]('head')[0]
    , uniqid = 0
    , callbackPrefix = 'reqwest_' + (+new Date())
    , lastValue // data stored by the most recent JSONP callback
    , xmlHttpRequest = 'XMLHttpRequest'
    , noop = function () {}

    , isArray = typeof Array.isArray == 'function'
        ? Array.isArray
        : function (a) {
            return a instanceof Array
          }

    , defaultHeaders = {
          contentType: 'application/x-www-form-urlencoded'
        , requestedWith: xmlHttpRequest
        , accept: {
              '*':  'text/javascript, text/html, application/xml, text/xml, */*'
            , xml:  'application/xml, text/xml'
            , html: 'text/html'
            , text: 'text/plain'
            , json: 'application/json, text/javascript'
            , js:   'application/javascript, text/javascript'
          }
      }

    , xhr = win[xmlHttpRequest]
        ? function () {
            return new XMLHttpRequest()
          }
        : function () {
            return new ActiveXObject('Microsoft.XMLHTTP')
          }
    , globalSetupOptions = {
        dataFilter: function (data) {
          return data
        }
      }

  function handleReadyState(r, success, error) {
    return function () {
      // use _aborted to mitigate against IE err c00c023f
      // (can't read props on aborted request objects)
      if (r._aborted) return error(r.request)
      if (r.request && r.request[readyState] == 4) {
        r.request.onreadystatechange = noop
        if (twoHundo.test(r.request.status))
          success(r.request)
        else
          error(r.request)
      }
    }
  }

  function setHeaders(http, o) {
    var headers = o.headers || {}
      , h

    headers.Accept = headers.Accept
      || defaultHeaders.accept[o.type]
      || defaultHeaders.accept['*']

    // breaks cross-origin requests with legacy browsers
    if (!o.crossOrigin && !headers[requestedWith]) headers[requestedWith] = defaultHeaders.requestedWith
    if (!headers[contentType]) headers[contentType] = o.contentType || defaultHeaders.contentType
    for (h in headers)
      headers.hasOwnProperty(h) && http.setRequestHeader(h, headers[h])
  }

  function setCredentials(http, o) {
    if (typeof o.withCredentials !== 'undefined' && typeof http.withCredentials !== 'undefined') {
      http.withCredentials = !!o.withCredentials
    }
  }

  function generalCallback(data) {
    lastValue = data
  }

  function urlappend (url, s) {
    return url + (/\?/.test(url) ? '&' : '?') + s
  }

  function handleJsonp(o, fn, err, url) {
    var reqId = uniqid++
      , cbkey = o.jsonpCallback || 'callback' // the 'callback' key
      , cbval = o.jsonpCallbackName || reqwest.getcallbackPrefix(reqId)
      // , cbval = o.jsonpCallbackName || ('reqwest_' + reqId) // the 'callback' value
      , cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)')
      , match = url.match(cbreg)
      , script = doc.createElement('script')
      , loaded = 0
      , isIE10 = navigator.userAgent.indexOf('MSIE 10.0') !== -1

    if (match) {
      if (match[3] === '?') {
        url = url.replace(cbreg, '$1=' + cbval) // wildcard callback func name
      } else {
        cbval = match[3] // provided callback func name
      }
    } else {
      url = urlappend(url, cbkey + '=' + cbval) // no callback details, add 'em
    }

    win[cbval] = generalCallback

    script.type = 'text/javascript'
    script.src = url
    script.async = true
    if (typeof script.onreadystatechange !== 'undefined' && !isIE10) {
      // need this for IE due to out-of-order onreadystatechange(), binding script
      // execution to an event listener gives us control over when the script
      // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
      //
      // if this hack is used in IE10 jsonp callback are never called
      script.event = 'onclick'
      script.htmlFor = script.id = '_reqwest_' + reqId
    }

    script.onload = script.onreadystatechange = function () {
      if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
        return false
      }
      script.onload = script.onreadystatechange = null
      script.onclick && script.onclick()
      // Call the user callback with the last value stored and clean up values and scripts.
      fn(lastValue)
      lastValue = undefined
      head.removeChild(script)
      loaded = 1
    }

    // Add the script to the DOM head
    head.appendChild(script)

    // Enable JSONP timeout
    return {
      abort: function () {
        script.onload = script.onreadystatechange = null
        err({}, 'Request is aborted: timeout', {})
        lastValue = undefined
        head.removeChild(script)
        loaded = 1
      }
    }
  }

  function getRequest(fn, err) {
    var o = this.o
      , method = (o.method || 'GET').toUpperCase()
      , url = typeof o === 'string' ? o : o.url
      // convert non-string objects to query-string form unless o.processData is false
      , data = (o.processData !== false && o.data && typeof o.data !== 'string')
        ? reqwest.toQueryString(o.data)
        : (o.data || null)
      , http

    // if we're working on a GET request and we have data then we should append
    // query string to end of URL and not post data
    if ((o.type == 'jsonp' || method == 'GET') && data) {
      url = urlappend(url, data)
      data = null
    }

    if (o.type == 'jsonp') return handleJsonp(o, fn, err, url)

    http = xhr()
    http.open(method, url, o.async === false ? false : true)
    setHeaders(http, o)
    setCredentials(http, o)
    http.onreadystatechange = handleReadyState(this, fn, err)
    o.before && o.before(http)
    http.send(data)
    return http
  }

  function Reqwest(o, fn) {
    this.o = o
    this.fn = fn

    init.apply(this, arguments)
  }

  function setType(url) {
    var m = url.match(/\.(json|jsonp|html|xml)(\?|$)/)
    return m ? m[1] : 'js'
  }

  function init(o, fn) {

    this.url = typeof o == 'string' ? o : o.url
    this.timeout = null

    // whether request has been fulfilled for purpose
    // of tracking the Promises
    this._fulfilled = false
    // success handlers
    this._fulfillmentHandlers = []
    // error handlers
    this._errorHandlers = []
    // complete (both success and fail) handlers
    this._completeHandlers = []
    this._erred = false
    this._responseArgs = {}

    var self = this
      , type = o.type || setType(this.url)

    fn = fn || function () {}

    if (o.timeout) {
      this.timeout = setTimeout(function () {
        self.abort()
      }, o.timeout)
    }

    if (o.success) {
      this._fulfillmentHandlers.push(function () {
        o.success.apply(o, arguments)
      })
    }

    if (o.error) {
      this._errorHandlers.push(function () {
        o.error.apply(o, arguments)
      })
    }

    if (o.complete) {
      this._completeHandlers.push(function () {
        o.complete.apply(o, arguments)
      })
    }

    function complete (resp) {
      o.timeout && clearTimeout(self.timeout)
      self.timeout = null
      while (self._completeHandlers.length > 0) {
        self._completeHandlers.shift()(resp)
      }
    }

    function success (resp) {
      // use global data filter on response text
      var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type)
        , r = resp.responseText = filteredResponse
      if (r) {
        switch (type) {
        case 'json':
          try {
            resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')
          } catch (err) {
            return error(resp, 'Could not parse JSON in response', err)
          }
          break
        case 'js':
          resp = eval(r)
          break
        case 'html':
          resp = r
          break
        case 'xml':
          resp = resp.responseXML
              && resp.responseXML.parseError // IE trololo
              && resp.responseXML.parseError.errorCode
              && resp.responseXML.parseError.reason
            ? null
            : resp.responseXML
          break
        }
      }

      self._responseArgs.resp = resp
      self._fulfilled = true
      fn(resp)
      while (self._fulfillmentHandlers.length > 0) {
        self._fulfillmentHandlers.shift()(resp)
      }

      complete(resp)
    }

    function error(resp, msg, t) {
      self._responseArgs.resp = resp
      self._responseArgs.msg = msg
      self._responseArgs.t = t
      self._erred = true
      while (self._errorHandlers.length > 0) {
        self._errorHandlers.shift()(resp, msg, t)
      }
      complete(resp)
    }

    this.request = getRequest.call(this, success, error)
  }

  Reqwest.prototype = {
    abort: function () {
      this._aborted = true
      this.request.abort()
    }

  , retry: function () {
      init.call(this, this.o, this.fn)
    }

    /**
     * Small deviation from the Promises A CommonJs specification
     * http://wiki.commonjs.org/wiki/Promises/A
     */

    /**
     * `then` will execute upon successful requests
     */
  , then: function (success, fail) {
      success = success || function () {}
      fail = fail || function () {}
      if (this._fulfilled) {
        success(this._responseArgs.resp)
      } else if (this._erred) {
        fail(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._fulfillmentHandlers.push(success)
        this._errorHandlers.push(fail)
      }
      return this
    }

    /**
     * `always` will execute whether the request succeeds or fails
     */
  , always: function (fn) {
      if (this._fulfilled || this._erred) {
        fn(this._responseArgs.resp)
      } else {
        this._completeHandlers.push(fn)
      }
      return this
    }

    /**
     * `fail` will execute when the request fails
     */
  , fail: function (fn) {
      if (this._erred) {
        fn(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._errorHandlers.push(fn)
      }
      return this
    }
  }

  function reqwest(o, fn) {
    return new Reqwest(o, fn)
  }

  // normalize newline variants according to spec -> CRLF
  function normalize(s) {
    return s ? s.replace(/\r?\n/g, '\r\n') : ''
  }

  function serial(el, cb) {
    var n = el.name
      , t = el.tagName.toLowerCase()
      , optCb = function (o) {
          // IE gives value="" even where there is no value attribute
          // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
          if (o && !o.disabled)
            cb(n, normalize(o.attributes.value && o.attributes.value.specified ? o.value : o.text))
        }
      , ch, ra, val, i

    // don't serialize elements that are disabled or without a name
    if (el.disabled || !n) return

    switch (t) {
    case 'input':
      if (!/reset|button|image|file/i.test(el.type)) {
        ch = /checkbox/i.test(el.type)
        ra = /radio/i.test(el.type)
        val = el.value
        // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
        ;(!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
      }
      break
    case 'textarea':
      cb(n, normalize(el.value))
      break
    case 'select':
      if (el.type.toLowerCase() === 'select-one') {
        optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
      } else {
        for (i = 0; el.length && i < el.length; i++) {
          el.options[i].selected && optCb(el.options[i])
        }
      }
      break
    }
  }

  // collect up all form elements found from the passed argument elements all
  // the way down to child elements; pass a '<form>' or form fields.
  // called with 'this'=callback to use for serial() on each element
  function eachFormElement() {
    var cb = this
      , e, i
      , serializeSubtags = function (e, tags) {
          var i, j, fa
          for (i = 0; i < tags.length; i++) {
            fa = e[byTag](tags[i])
            for (j = 0; j < fa.length; j++) serial(fa[j], cb)
          }
        }

    for (i = 0; i < arguments.length; i++) {
      e = arguments[i]
      if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
      serializeSubtags(e, [ 'input', 'select', 'textarea' ])
    }
  }

  // standard query string style serialization
  function serializeQueryString() {
    return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
  }

  // { 'name': 'value', ... } style serialization
  function serializeHash() {
    var hash = {}
    eachFormElement.apply(function (name, value) {
      if (name in hash) {
        hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
        hash[name].push(value)
      } else hash[name] = value
    }, arguments)
    return hash
  }

  // [ { name: 'name', value: 'value' }, ... ] style serialization
  reqwest.serializeArray = function () {
    var arr = []
    eachFormElement.apply(function (name, value) {
      arr.push({name: name, value: value})
    }, arguments)
    return arr
  }

  reqwest.serialize = function () {
    if (arguments.length === 0) return ''
    var opt, fn
      , args = Array.prototype.slice.call(arguments, 0)

    opt = args.pop()
    opt && opt.nodeType && args.push(opt) && (opt = null)
    opt && (opt = opt.type)

    if (opt == 'map') fn = serializeHash
    else if (opt == 'array') fn = reqwest.serializeArray
    else fn = serializeQueryString

    return fn.apply(null, args)
  }

  reqwest.toQueryString = function (o, trad) {
    var prefix, i
      , traditional = trad || false
      , s = []
      , enc = encodeURIComponent
      , add = function (key, value) {
          // If value is a function, invoke it and return its value
          value = ('function' === typeof value) ? value() : (value == null ? '' : value)
          s[s.length] = enc(key) + '=' + enc(value)
        }
    // If an array was passed in, assume that it is an array of form elements.
    if (isArray(o)) {
      for (i = 0; o && i < o.length; i++) add(o[i].name, o[i].value)
    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in o) {
        buildParams(prefix, o[prefix], traditional, add)
      }
    }

    // spaces should be + according to spec
    return s.join('&').replace(/%20/g, '+')
  }

  function buildParams(prefix, obj, traditional, add) {
    var name, i, v
      , rbracket = /\[\]$/

    if (isArray(obj)) {
      // Serialize array item.
      for (i = 0; obj && i < obj.length; i++) {
        v = obj[i]
        if (traditional || rbracket.test(prefix)) {
          // Treat each array item as a scalar.
          add(prefix, v)
        } else {
          buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v, traditional, add)
        }
      }
    } else if (obj && obj.toString() === '[object Object]') {
      // Serialize object item.
      for (name in obj) {
        buildParams(prefix + '[' + name + ']', obj[name], traditional, add)
      }

    } else {
      // Serialize scalar item.
      add(prefix, obj)
    }
  }

  reqwest.getcallbackPrefix = function () {
    return callbackPrefix
  }

  // jQuery and Zepto compatibility, differences can be remapped here so you can call
  // .ajax.compat(options, callback)
  reqwest.compat = function (o, fn) {
    if (o) {
      o.type && (o.method = o.type) && delete o.type
      o.dataType && (o.type = o.dataType)
      o.jsonpCallback && (o.jsonpCallbackName = o.jsonpCallback) && delete o.jsonpCallback
      o.jsonp && (o.jsonpCallback = o.jsonp)
    }
    return new Reqwest(o, fn)
  }

  reqwest.ajaxSetup = function (options) {
    options = options || {}
    for (var k in options) {
      globalSetupOptions[k] = options[k]
    }
  }

  return reqwest
});
  define.importing = 'Sizzle';
  /* [square] Directive: /home/swaagie/projects/cortex/node_modules/sizzle/sizzle.js */
/*!
 * Sizzle CSS Selector Engine
 *  Copyright 2011, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */
(function(){

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
	expando = "sizcache" + (Math.random() + '').replace('.', ''),
	done = 0,
	toString = Object.prototype.toString,
	hasDuplicate = false,
	baseHasDuplicate = true,
	rBackslash = /\\/g,
	rReturn = /\r\n/g,
	rNonWord = /\W/;

// Here we check if the JavaScript engine is using some sort of
// optimization where it does not always call our comparision
// function. If that is the case, discard the hasDuplicate value.
//   Thus far that includes Google Chrome.
[0, 0].sort(function() {
	baseHasDuplicate = false;
	return 0;
});

var Sizzle = function( selector, context, results, seed ) {
	results = results || [];
	context = context || document;

	var origContext = context;

	if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	var m, set, checkSet, extra, ret, cur, pop, i,
		prune = true,
		contextXML = Sizzle.isXML( context ),
		parts = [],
		soFar = selector;

	// Reset the position of the chunker regexp (start from head)
	do {
		chunker.exec( "" );
		m = chunker.exec( soFar );

		if ( m ) {
			soFar = m[3];

			parts.push( m[1] );

			if ( m[2] ) {
				extra = m[3];
				break;
			}
		}
	} while ( m );

	if ( parts.length > 1 && origPOS.exec( selector ) ) {

		if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
			set = posProcess( parts[0] + parts[1], context, seed );

		} else {
			set = Expr.relative[ parts[0] ] ?
				[ context ] :
				Sizzle( parts.shift(), context );

			while ( parts.length ) {
				selector = parts.shift();

				if ( Expr.relative[ selector ] ) {
					selector += parts.shift();
				}

				set = posProcess( selector, set, seed );
			}
		}

	} else {
		// Take a shortcut and set the context if the root selector is an ID
		// (but not if it'll be faster if the inner selector is an ID)
		if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
				Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {

			ret = Sizzle.find( parts.shift(), context, contextXML );
			context = ret.expr ?
				Sizzle.filter( ret.expr, ret.set )[0] :
				ret.set[0];
		}

		if ( context ) {
			ret = seed ?
				{ expr: parts.pop(), set: makeArray(seed) } :
				Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );

			set = ret.expr ?
				Sizzle.filter( ret.expr, ret.set ) :
				ret.set;

			if ( parts.length > 0 ) {
				checkSet = makeArray( set );

			} else {
				prune = false;
			}

			while ( parts.length ) {
				cur = parts.pop();
				pop = cur;

				if ( !Expr.relative[ cur ] ) {
					cur = "";
				} else {
					pop = parts.pop();
				}

				if ( pop == null ) {
					pop = context;
				}

				Expr.relative[ cur ]( checkSet, pop, contextXML );
			}

		} else {
			checkSet = parts = [];
		}
	}

	if ( !checkSet ) {
		checkSet = set;
	}

	if ( !checkSet ) {
		Sizzle.error( cur || selector );
	}

	if ( toString.call(checkSet) === "[object Array]" ) {
		if ( !prune ) {
			results.push.apply( results, checkSet );

		} else if ( context && context.nodeType === 1 ) {
			for ( i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && Sizzle.contains(context, checkSet[i])) ) {
					results.push( set[i] );
				}
			}

		} else {
			for ( i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
					results.push( set[i] );
				}
			}
		}

	} else {
		makeArray( checkSet, results );
	}

	if ( extra ) {
		Sizzle( extra, origContext, results, seed );
		Sizzle.uniqueSort( results );
	}

	return results;
};

Sizzle.uniqueSort = function( results ) {
	if ( sortOrder ) {
		hasDuplicate = baseHasDuplicate;
		results.sort( sortOrder );

		if ( hasDuplicate ) {
			for ( var i = 1; i < results.length; i++ ) {
				if ( results[i] === results[ i - 1 ] ) {
					results.splice( i--, 1 );
				}
			}
		}
	}

	return results;
};

Sizzle.matches = function( expr, set ) {
	return Sizzle( expr, null, null, set );
};

Sizzle.matchesSelector = function( node, expr ) {
	return Sizzle( expr, null, null, [node] ).length > 0;
};

Sizzle.find = function( expr, context, isXML ) {
	var set, i, len, match, type, left;

	if ( !expr ) {
		return [];
	}

	for ( i = 0, len = Expr.order.length; i < len; i++ ) {
		type = Expr.order[i];

		if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
			left = match[1];
			match.splice( 1, 1 );

			if ( left.substr( left.length - 1 ) !== "\\" ) {
				match[1] = (match[1] || "").replace( rBackslash, "" );
				set = Expr.find[ type ]( match, context, isXML );

				if ( set != null ) {
					expr = expr.replace( Expr.match[ type ], "" );
					break;
				}
			}
		}
	}

	if ( !set ) {
		set = typeof context.getElementsByTagName !== "undefined" ?
			context.getElementsByTagName( "*" ) :
			[];
	}

	return { set: set, expr: expr };
};

Sizzle.filter = function( expr, set, inplace, not ) {
	var match, anyFound,
		type, found, item, filter, left,
		i, pass,
		old = expr,
		result = [],
		curLoop = set,
		isXMLFilter = set && set[0] && Sizzle.isXML( set[0] );

	while ( expr && set.length ) {
		for ( type in Expr.filter ) {
			if ( (match = Expr.leftMatch[ type ].exec( expr )) != null && match[2] ) {
				filter = Expr.filter[ type ];
				left = match[1];

				anyFound = false;

				match.splice(1,1);

				if ( left.substr( left.length - 1 ) === "\\" ) {
					continue;
				}

				if ( curLoop === result ) {
					result = [];
				}

				if ( Expr.preFilter[ type ] ) {
					match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

					if ( !match ) {
						anyFound = found = true;

					} else if ( match === true ) {
						continue;
					}
				}

				if ( match ) {
					for ( i = 0; (item = curLoop[i]) != null; i++ ) {
						if ( item ) {
							found = filter( item, match, i, curLoop );
							pass = not ^ found;

							if ( inplace && found != null ) {
								if ( pass ) {
									anyFound = true;

								} else {
									curLoop[i] = false;
								}

							} else if ( pass ) {
								result.push( item );
								anyFound = true;
							}
						}
					}
				}

				if ( found !== undefined ) {
					if ( !inplace ) {
						curLoop = result;
					}

					expr = expr.replace( Expr.match[ type ], "" );

					if ( !anyFound ) {
						return [];
					}

					break;
				}
			}
		}

		// Improper expression
		if ( expr === old ) {
			if ( anyFound == null ) {
				Sizzle.error( expr );

			} else {
				break;
			}
		}

		old = expr;
	}

	return curLoop;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Utility function for retreiving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
var getText = Sizzle.getText = function( elem ) {
    var i, node,
		nodeType = elem.nodeType,
		ret = "";

	if ( nodeType ) {
		if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent || innerText for elements
			if ( typeof elem.textContent === 'string' ) {
				return elem.textContent;
			} else if ( typeof elem.innerText === 'string' ) {
				// Replace IE's carriage returns
				return elem.innerText.replace( rReturn, '' );
			} else {
				// Traverse it's children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
	} else {

		// If no nodeType, this is expected to be an array
		for ( i = 0; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			if ( node.nodeType !== 8 ) {
				ret += getText( node );
			}
		}
	}
	return ret;
};

var Expr = Sizzle.selectors = {
	order: [ "ID", "NAME", "TAG" ],

	match: {
		ID: /#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
		CLASS: /\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
		NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,
		ATTR: /\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,
		TAG: /^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,
		CHILD: /:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,
		POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,
		PSEUDO: /:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/
	},

	leftMatch: {},

	attrMap: {
		"class": "className",
		"for": "htmlFor"
	},

	attrHandle: {
		href: function( elem ) {
			return elem.getAttribute( "href" );
		},
		type: function( elem ) {
			return elem.getAttribute( "type" );
		}
	},

	relative: {
		"+": function(checkSet, part){
			var isPartStr = typeof part === "string",
				isTag = isPartStr && !rNonWord.test( part ),
				isPartStrNotTag = isPartStr && !isTag;

			if ( isTag ) {
				part = part.toLowerCase();
			}

			for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
				if ( (elem = checkSet[i]) ) {
					while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

					checkSet[i] = isPartStrNotTag || elem && elem.nodeName.toLowerCase() === part ?
						elem || false :
						elem === part;
				}
			}

			if ( isPartStrNotTag ) {
				Sizzle.filter( part, checkSet, true );
			}
		},

		">": function( checkSet, part ) {
			var elem,
				isPartStr = typeof part === "string",
				i = 0,
				l = checkSet.length;

			if ( isPartStr && !rNonWord.test( part ) ) {
				part = part.toLowerCase();

				for ( ; i < l; i++ ) {
					elem = checkSet[i];

					if ( elem ) {
						var parent = elem.parentNode;
						checkSet[i] = parent.nodeName.toLowerCase() === part ? parent : false;
					}
				}

			} else {
				for ( ; i < l; i++ ) {
					elem = checkSet[i];

					if ( elem ) {
						checkSet[i] = isPartStr ?
							elem.parentNode :
							elem.parentNode === part;
					}
				}

				if ( isPartStr ) {
					Sizzle.filter( part, checkSet, true );
				}
			}
		},

		"": function(checkSet, part, isXML){
			var nodeCheck,
				doneName = done++,
				checkFn = dirCheck;

			if ( typeof part === "string" && !rNonWord.test( part ) ) {
				part = part.toLowerCase();
				nodeCheck = part;
				checkFn = dirNodeCheck;
			}

			checkFn( "parentNode", part, doneName, checkSet, nodeCheck, isXML );
		},

		"~": function( checkSet, part, isXML ) {
			var nodeCheck,
				doneName = done++,
				checkFn = dirCheck;

			if ( typeof part === "string" && !rNonWord.test( part ) ) {
				part = part.toLowerCase();
				nodeCheck = part;
				checkFn = dirNodeCheck;
			}

			checkFn( "previousSibling", part, doneName, checkSet, nodeCheck, isXML );
		}
	},

	find: {
		ID: function( match, context, isXML ) {
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		},

		NAME: function( match, context ) {
			if ( typeof context.getElementsByName !== "undefined" ) {
				var ret = [],
					results = context.getElementsByName( match[1] );

				for ( var i = 0, l = results.length; i < l; i++ ) {
					if ( results[i].getAttribute("name") === match[1] ) {
						ret.push( results[i] );
					}
				}

				return ret.length === 0 ? null : ret;
			}
		},

		TAG: function( match, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( match[1] );
			}
		}
	},
	preFilter: {
		CLASS: function( match, curLoop, inplace, result, not, isXML ) {
			match = " " + match[1].replace( rBackslash, "" ) + " ";

			if ( isXML ) {
				return match;
			}

			for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
				if ( elem ) {
					if ( not ^ (elem.className && (" " + elem.className + " ").replace(/[\t\n\r]/g, " ").indexOf(match) >= 0) ) {
						if ( !inplace ) {
							result.push( elem );
						}

					} else if ( inplace ) {
						curLoop[i] = false;
					}
				}
			}

			return false;
		},

		ID: function( match ) {
			return match[1].replace( rBackslash, "" );
		},

		TAG: function( match, curLoop ) {
			return match[1].replace( rBackslash, "" ).toLowerCase();
		},

		CHILD: function( match ) {
			if ( match[1] === "nth" ) {
				if ( !match[2] ) {
					Sizzle.error( match[0] );
				}

				match[2] = match[2].replace(/^\+|\s*/g, '');

				// parse equations like 'even', 'odd', '5', '2n', '3n+2', '4n-1', '-n+6'
				var test = /(-?)(\d*)(?:n([+\-]?\d*))?/.exec(
					match[2] === "even" && "2n" || match[2] === "odd" && "2n+1" ||
					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

				// calculate the numbers (first)n+(last) including if they are negative
				match[2] = (test[1] + (test[2] || 1)) - 0;
				match[3] = test[3] - 0;
			}
			else if ( match[2] ) {
				Sizzle.error( match[0] );
			}

			// TODO: Move to normal caching system
			match[0] = done++;

			return match;
		},

		ATTR: function( match, curLoop, inplace, result, not, isXML ) {
			var name = match[1] = match[1].replace( rBackslash, "" );

			if ( !isXML && Expr.attrMap[name] ) {
				match[1] = Expr.attrMap[name];
			}

			// Handle if an un-quoted value was used
			match[4] = ( match[4] || match[5] || "" ).replace( rBackslash, "" );

			if ( match[2] === "~=" ) {
				match[4] = " " + match[4] + " ";
			}

			return match;
		},

		PSEUDO: function( match, curLoop, inplace, result, not ) {
			if ( match[1] === "not" ) {
				// If we're dealing with a complex expression, or a simple one
				if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
					match[3] = Sizzle(match[3], null, null, curLoop);

				} else {
					var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);

					if ( !inplace ) {
						result.push.apply( result, ret );
					}

					return false;
				}

			} else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
				return true;
			}

			return match;
		},

		POS: function( match ) {
			match.unshift( true );

			return match;
		}
	},

	filters: {
		enabled: function( elem ) {
			return elem.disabled === false && elem.type !== "hidden";
		},

		disabled: function( elem ) {
			return elem.disabled === true;
		},

		checked: function( elem ) {
			return elem.checked === true;
		},

		selected: function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		parent: function( elem ) {
			return !!elem.firstChild;
		},

		empty: function( elem ) {
			return !elem.firstChild;
		},

		has: function( elem, i, match ) {
			return !!Sizzle( match[3], elem ).length;
		},

		header: function( elem ) {
			return (/h\d/i).test( elem.nodeName );
		},

		text: function( elem ) {
			var attr = elem.getAttribute( "type" ), type = elem.type;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" && "text" === type && ( attr === type || attr === null );
		},

		radio: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "radio" === elem.type;
		},

		checkbox: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "checkbox" === elem.type;
		},

		file: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "file" === elem.type;
		},

		password: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "password" === elem.type;
		},

		submit: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && "submit" === elem.type;
		},

		image: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "image" === elem.type;
		},

		reset: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && "reset" === elem.type;
		},

		button: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && "button" === elem.type || name === "button";
		},

		input: function( elem ) {
			return (/input|select|textarea|button/i).test( elem.nodeName );
		},

		focus: function( elem ) {
			return elem === elem.ownerDocument.activeElement;
		}
	},
	setFilters: {
		first: function( elem, i ) {
			return i === 0;
		},

		last: function( elem, i, match, array ) {
			return i === array.length - 1;
		},

		even: function( elem, i ) {
			return i % 2 === 0;
		},

		odd: function( elem, i ) {
			return i % 2 === 1;
		},

		lt: function( elem, i, match ) {
			return i < match[3] - 0;
		},

		gt: function( elem, i, match ) {
			return i > match[3] - 0;
		},

		nth: function( elem, i, match ) {
			return match[3] - 0 === i;
		},

		eq: function( elem, i, match ) {
			return match[3] - 0 === i;
		}
	},
	filter: {
		PSEUDO: function( elem, match, i, array ) {
			var name = match[1],
				filter = Expr.filters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );

			} else if ( name === "contains" ) {
				return (elem.textContent || elem.innerText || getText([ elem ]) || "").indexOf(match[3]) >= 0;

			} else if ( name === "not" ) {
				var not = match[3];

				for ( var j = 0, l = not.length; j < l; j++ ) {
					if ( not[j] === elem ) {
						return false;
					}
				}

				return true;

			} else {
				Sizzle.error( name );
			}
		},

		CHILD: function( elem, match ) {
			var first, last,
				doneName, parent, cache,
				count, diff,
				type = match[1],
				node = elem;

			switch ( type ) {
				case "only":
				case "first":
					while ( (node = node.previousSibling) ) {
						if ( node.nodeType === 1 ) {
							return false;
						}
					}

					if ( type === "first" ) {
						return true;
					}

					node = elem;

					/* falls through */
				case "last":
					while ( (node = node.nextSibling) ) {
						if ( node.nodeType === 1 ) {
							return false;
						}
					}

					return true;

				case "nth":
					first = match[2];
					last = match[3];

					if ( first === 1 && last === 0 ) {
						return true;
					}

					doneName = match[0];
					parent = elem.parentNode;

					if ( parent && (parent[ expando ] !== doneName || !elem.nodeIndex) ) {
						count = 0;

						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.nodeIndex = ++count;
							}
						}

						parent[ expando ] = doneName;
					}

					diff = elem.nodeIndex - last;

					if ( first === 0 ) {
						return diff === 0;

					} else {
						return ( diff % first === 0 && diff / first >= 0 );
					}
			}
		},

		ID: function( elem, match ) {
			return elem.nodeType === 1 && elem.getAttribute("id") === match;
		},

		TAG: function( elem, match ) {
			return (match === "*" && elem.nodeType === 1) || !!elem.nodeName && elem.nodeName.toLowerCase() === match;
		},

		CLASS: function( elem, match ) {
			return (" " + (elem.className || elem.getAttribute("class")) + " ")
				.indexOf( match ) > -1;
		},

		ATTR: function( elem, match ) {
			var name = match[1],
				result = Sizzle.attr ?
					Sizzle.attr( elem, name ) :
					Expr.attrHandle[ name ] ?
					Expr.attrHandle[ name ]( elem ) :
					elem[ name ] != null ?
						elem[ name ] :
						elem.getAttribute( name ),
				value = result + "",
				type = match[2],
				check = match[4];

			return result == null ?
				type === "!=" :
				!type && Sizzle.attr ?
				result != null :
				type === "=" ?
				value === check :
				type === "*=" ?
				value.indexOf(check) >= 0 :
				type === "~=" ?
				(" " + value + " ").indexOf(check) >= 0 :
				!check ?
				value && result !== false :
				type === "!=" ?
				value !== check :
				type === "^=" ?
				value.indexOf(check) === 0 :
				type === "$=" ?
				value.substr(value.length - check.length) === check :
				type === "|=" ?
				value === check || value.substr(0, check.length + 1) === check + "-" :
				false;
		},

		POS: function( elem, match, i, array ) {
			var name = match[2],
				filter = Expr.setFilters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			}
		}
	}
};

var origPOS = Expr.match.POS,
	fescape = function(all, num){
		return "\\" + (num - 0 + 1);
	};

for ( var type in Expr.match ) {
	Expr.match[ type ] = new RegExp( Expr.match[ type ].source + (/(?![^\[]*\])(?![^\(]*\))/.source) );
	Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source.replace(/\\(\d+)/g, fescape) );
}
// Expose origPOS
// "global" as in regardless of relation to brackets/parens
Expr.match.globalPOS = origPOS;

var makeArray = function( array, results ) {
	array = Array.prototype.slice.call( array, 0 );

	if ( results ) {
		results.push.apply( results, array );
		return results;
	}

	return array;
};

// Perform a simple check to determine if the browser is capable of
// converting a NodeList to an array using builtin methods.
// Also verifies that the returned array holds DOM nodes
// (which is not the case in the Blackberry browser)
try {
	Array.prototype.slice.call( document.documentElement.childNodes, 0 )[0].nodeType;

// Provide a fallback method if it does not work
} catch( e ) {
	makeArray = function( array, results ) {
		var i = 0,
			ret = results || [];

		if ( toString.call(array) === "[object Array]" ) {
			Array.prototype.push.apply( ret, array );

		} else {
			if ( typeof array.length === "number" ) {
				for ( var l = array.length; i < l; i++ ) {
					ret.push( array[i] );
				}

			} else {
				for ( ; array[i]; i++ ) {
					ret.push( array[i] );
				}
			}
		}

		return ret;
	};
}

var sortOrder, siblingCheck;

if ( document.documentElement.compareDocumentPosition ) {
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
			return a.compareDocumentPosition ? -1 : 1;
		}

		return a.compareDocumentPosition(b) & 4 ? -1 : 1;
	};

} else {
	sortOrder = function( a, b ) {
		// The nodes are identical, we can exit early
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Fallback to using sourceIndex (in IE) if it's available on both nodes
		} else if ( a.sourceIndex && b.sourceIndex ) {
			return a.sourceIndex - b.sourceIndex;
		}

		var al, bl,
			ap = [],
			bp = [],
			aup = a.parentNode,
			bup = b.parentNode,
			cur = aup;

		// If the nodes are siblings (or identical) we can do a quick check
		if ( aup === bup ) {
			return siblingCheck( a, b );

		// If no parents were found then the nodes are disconnected
		} else if ( !aup ) {
			return -1;

		} else if ( !bup ) {
			return 1;
		}

		// Otherwise they're somewhere else in the tree so we need
		// to build up a full list of the parentNodes for comparison
		while ( cur ) {
			ap.unshift( cur );
			cur = cur.parentNode;
		}

		cur = bup;

		while ( cur ) {
			bp.unshift( cur );
			cur = cur.parentNode;
		}

		al = ap.length;
		bl = bp.length;

		// Start walking down the tree looking for a discrepancy
		for ( var i = 0; i < al && i < bl; i++ ) {
			if ( ap[i] !== bp[i] ) {
				return siblingCheck( ap[i], bp[i] );
			}
		}

		// We ended someplace up the tree so do a sibling check
		return i === al ?
			siblingCheck( a, bp[i], -1 ) :
			siblingCheck( ap[i], b, 1 );
	};

	siblingCheck = function( a, b, ret ) {
		if ( a === b ) {
			return ret;
		}

		var cur = a.nextSibling;

		while ( cur ) {
			if ( cur === b ) {
				return -1;
			}

			cur = cur.nextSibling;
		}

		return 1;
	};
}

// Check to see if the browser returns elements by name when
// querying by getElementById (and provide a workaround)
(function(){
	// We're going to inject a fake input element with a specified name
	var form = document.createElement("div"),
		id = "script" + (new Date()).getTime(),
		root = document.documentElement;

	form.innerHTML = "<a name='" + id + "'/>";

	// Inject it into the root element, check its status, and remove it quickly
	root.insertBefore( form, root.firstChild );

	// The workaround has to do additional checks after a getElementById
	// Which slows things down for other browsers (hence the branching)
	if ( document.getElementById( id ) ) {
		Expr.find.ID = function( match, context, isXML ) {
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);

				return m ?
					m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ?
						[m] :
						undefined :
					[];
			}
		};

		Expr.filter.ID = function( elem, match ) {
			var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");

			return elem.nodeType === 1 && node && node.nodeValue === match;
		};
	}

	root.removeChild( form );

	// release memory in IE
	root = form = null;
})();

(function(){
	// Check to see if the browser returns only elements
	// when doing getElementsByTagName("*")

	// Create a fake element
	var div = document.createElement("div");
	div.appendChild( document.createComment("") );

	// Make sure no comments are found
	if ( div.getElementsByTagName("*").length > 0 ) {
		Expr.find.TAG = function( match, context ) {
			var results = context.getElementsByTagName( match[1] );

			// Filter out possible comments
			if ( match[1] === "*" ) {
				var tmp = [];

				for ( var i = 0; results[i]; i++ ) {
					if ( results[i].nodeType === 1 ) {
						tmp.push( results[i] );
					}
				}

				results = tmp;
			}

			return results;
		};
	}

	// Check to see if an attribute returns normalized href attributes
	div.innerHTML = "<a href='#'></a>";

	if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
			div.firstChild.getAttribute("href") !== "#" ) {

		Expr.attrHandle.href = function( elem ) {
			return elem.getAttribute( "href", 2 );
		};
	}

	// release memory in IE
	div = null;
})();

if ( document.querySelectorAll ) {
	(function(){
		var oldSizzle = Sizzle,
			div = document.createElement("div"),
			id = "__sizzle__";

		div.innerHTML = "<p class='TEST'></p>";

		// Safari can't handle uppercase or unicode characters when
		// in quirks mode.
		if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
			return;
		}

		Sizzle = function( query, context, extra, seed ) {
			context = context || document;

			// Only use querySelectorAll on non-XML documents
			// (ID selectors don't work in non-HTML documents)
			if ( !seed && !Sizzle.isXML(context) ) {
				// See if we find a selector to speed up
				var match = /^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec( query );

				if ( match && (context.nodeType === 1 || context.nodeType === 9) ) {
					// Speed-up: Sizzle("TAG")
					if ( match[1] ) {
						return makeArray( context.getElementsByTagName( query ), extra );

					// Speed-up: Sizzle(".CLASS")
					} else if ( match[2] && Expr.find.CLASS && context.getElementsByClassName ) {
						return makeArray( context.getElementsByClassName( match[2] ), extra );
					}
				}

				if ( context.nodeType === 9 ) {
					// Speed-up: Sizzle("body")
					// The body element only exists once, optimize finding it
					if ( query === "body" && context.body ) {
						return makeArray( [ context.body ], extra );

					// Speed-up: Sizzle("#ID")
					} else if ( match && match[3] ) {
						var elem = context.getElementById( match[3] );

						// Check parentNode to catch when Blackberry 4.6 returns
						// nodes that are no longer in the document #6963
						if ( elem && elem.parentNode ) {
							// Handle the case where IE and Opera return items
							// by name instead of ID
							if ( elem.id === match[3] ) {
								return makeArray( [ elem ], extra );
							}

						} else {
							return makeArray( [], extra );
						}
					}

					try {
						return makeArray( context.querySelectorAll(query), extra );
					} catch(qsaError) {}

				// qSA works strangely on Element-rooted queries
				// We can work around this by specifying an extra ID on the root
				// and working up from there (Thanks to Andrew Dupont for the technique)
				// IE 8 doesn't work on object elements
				} else if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
					var oldContext = context,
						old = context.getAttribute( "id" ),
						nid = old || id,
						hasParent = context.parentNode,
						relativeHierarchySelector = /^\s*[+~]/.test( query );

					if ( !old ) {
						context.setAttribute( "id", nid );
					} else {
						nid = nid.replace( /'/g, "\\$&" );
					}
					if ( relativeHierarchySelector && hasParent ) {
						context = context.parentNode;
					}

					try {
						if ( !relativeHierarchySelector || hasParent ) {
							return makeArray( context.querySelectorAll( "[id='" + nid + "'] " + query ), extra );
						}

					} catch(pseudoError) {
					} finally {
						if ( !old ) {
							oldContext.removeAttribute( "id" );
						}
					}
				}
			}

			return oldSizzle(query, context, extra, seed);
		};

		for ( var prop in oldSizzle ) {
			Sizzle[ prop ] = oldSizzle[ prop ];
		}

		// release memory in IE
		div = null;
	})();
}

(function(){
	var html = document.documentElement,
		matches = html.matchesSelector || html.mozMatchesSelector || html.webkitMatchesSelector || html.msMatchesSelector;

	if ( matches ) {
		// Check to see if it's possible to do matchesSelector
		// on a disconnected node (IE 9 fails this)
		var disconnectedMatch = !matches.call( document.createElement( "div" ), "div" ),
			pseudoWorks = false;

		try {
			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( document.documentElement, "[test!='']:sizzle" );

		} catch( pseudoError ) {
			pseudoWorks = true;
		}

		Sizzle.matchesSelector = function( node, expr ) {
			// Make sure that attribute selectors are quoted
			expr = expr.replace(/\=\s*([^'"\]]*)\s*\]/g, "='$1']");

			if ( !Sizzle.isXML( node ) ) {
				try {
					if ( pseudoWorks || !Expr.match.PSEUDO.test( expr ) && !/!=/.test( expr ) ) {
						var ret = matches.call( node, expr );

						// IE 9's matchesSelector returns false on disconnected nodes
						if ( ret || !disconnectedMatch ||
								// As well, disconnected nodes are said to be in a document
								// fragment in IE 9, so check for that
								node.document && node.document.nodeType !== 11 ) {
							return ret;
						}
					}
				} catch(e) {}
			}

			return Sizzle(expr, null, null, [node]).length > 0;
		};
	}
})();

(function(){
	var div = document.createElement("div");

	div.innerHTML = "<div class='test e'></div><div class='test'></div>";

	// Opera can't find a second classname (in 9.6)
	// Also, make sure that getElementsByClassName actually exists
	if ( !div.getElementsByClassName || div.getElementsByClassName("e").length === 0 ) {
		return;
	}

	// Safari caches class attributes, doesn't catch changes (in 3.2)
	div.lastChild.className = "e";

	if ( div.getElementsByClassName("e").length === 1 ) {
		return;
	}

	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function( match, context, isXML ) {
		if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
			return context.getElementsByClassName(match[1]);
		}
	};

	// release memory in IE
	div = null;
})();

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];

		if ( elem ) {
			var match = false;

			elem = elem[dir];

			while ( elem ) {
				if ( elem[ expando ] === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 && !isXML ){
					elem[ expando ] = doneName;
					elem.sizset = i;
				}

				if ( elem.nodeName.toLowerCase() === cur ) {
					match = elem;
					break;
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];

		if ( elem ) {
			var match = false;

			elem = elem[dir];

			while ( elem ) {
				if ( elem[ expando ] === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 ) {
					if ( !isXML ) {
						elem[ expando ] = doneName;
						elem.sizset = i;
					}

					if ( typeof cur !== "string" ) {
						if ( elem === cur ) {
							match = true;
							break;
						}

					} else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
						match = elem;
						break;
					}
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

if ( document.documentElement.contains ) {
	Sizzle.contains = function( a, b ) {
		return a !== b && (a.contains ? a.contains(b) : true);
	};

} else if ( document.documentElement.compareDocumentPosition ) {
	Sizzle.contains = function( a, b ) {
		return !!(a.compareDocumentPosition(b) & 16);
	};

} else {
	Sizzle.contains = function() {
		return false;
	};
}

Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;

	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

var posProcess = function( selector, context, seed ) {
	var match,
		tmpSet = [],
		later = "",
		root = context.nodeType ? [context] : context;

	// Position selectors must be done after the filter
	// And so must :not(positional) so we move all PSEUDOs to the end
	while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
		later += match[0];
		selector = selector.replace( Expr.match.PSEUDO, "" );
	}

	selector = Expr.relative[selector] ? selector + "*" : selector;

	for ( var i = 0, l = root.length; i < l; i++ ) {
		Sizzle( selector, root[i], tmpSet, seed );
	}

	return Sizzle.filter( later, tmpSet );
};

// EXPOSE

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Sizzle;
} else {
  window.Sizzle = Sizzle;
}

})();

  // Make sure that it's still accessible from the outside, and rename them to
  // sensible defaults..
  Cortex.Plates = Plates;
  Cortex.request = Cortex.reqwest;

  // Add our polyfills
  /* [square] Directive: /home/swaagie/projects/cortex/lib/cortex.polyfill.js */
/**
 * Polyfill Array#map
 * @see https://gist.github.com/1031568
 */
[].map||(Array.prototype.map=function(a){for(var b=this,c=b.length,d=[],e=0,f;e<b;)d[e]=e in b?a.call(arguments[1],b[e],e++,b):f;return d});

/**
 * Polyfill Array#filter
 * @see https://gist.github.com/1031656
 */
[].filter||(Array.prototype.filter=function(a,b,c,d,e){c=this;d=[];for(e in c)~~e+''==e&&e>=0&&a.call(b,c[e],+e,c)&&d.push(c[e]);return d});

/**
 * Polyfill Array#indexOf
 * @see https://gist.github.com/1034425
 */
[].indexOf||(Array.prototype.indexOf=function(a,b,c){for(c=this.length,b=(c+~~b)%c;b<c&&(!(b in this)||this[b]!==a);b++);return b^c?b:-1;});

/**
 * Polyfill Array.isArray
 * @see https://gist.github.com/1034882
 */
Array.isArray||(Array.isArray=function(a){return''+a!==a&&{}.toString.call(a)=='[object Array]'});

/**
 * Polyfill String#trim
 * @see https://gist.github.com/1035982
 */
''.trim||(String.prototype.trim=function(){return this.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g,'')});

/**
 * Polyfill for Function#bind
 * @see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind#Compatibility
 */
Function.prototype.bind = Function.prototype.bind || function bind(oThis) {
  var aArgs = Array.prototype.slice.call(arguments, 1)
    , fToBind = this
    , fNOP = function () {}
    , fBound = function () {
        return fToBind.apply(
            this instanceof fNOP && oThis
              ? this
              : oThis
           , aArgs.concat(Array.prototype.slice.call(arguments))
        );
      };

  fNOP.prototype = this.prototype;
  fBound.prototype = new fNOP();

  return fBound;
};

/**
 * Setup a placeholder fallback.
 */
var Placeholder = Cortex.View.extend({
    selector: 'input[placeholder]'

    /**
     * Delegate the events
     *
     * @type {Object}
     */
  , delegate: {
        'focus': 'focus'
      , 'change': 'blur'
      , 'mousedown': 'readable'
      , 'mouseout': 'blur'
      , 'blur': 'blur'
    }

    /**
     * The className that is added when the CSS should emulate a placeholder.
     *
     * @type {String}
     */
  , className: 'placeholder-polyfill'

    /**
     * Prepare the current inputs
     */
  , initialize: function initialize() {
      this.prepare();
    }

    /**
     * Prepare the inputs.
     */
  , prepare: function prepare() {
      $(this.selector).forEach(function (input) {
        var value = input.get('value') || '';

        input.set('input-type', input.get('type') || 'text');

        if (value === '') input.set('value', input.get('placeholder'));
        if (input.get('value') === input.get('placeholder')) {
          input.addClass(this.className).set('type', 'text').set('readOnly', true);
        }
      }, this);
    }

    /**
     * Remove the readonly before we focus or blur, this way, we give the
     * browser enought time to figure out that these fields are actually
     * editable.
     */
  , readable: function readable(e) {
      e.element.readOnly = false;
      delete e.element.readOnly

      e.element.removeAttribute('readOnly', 0);
    }

    /**
     * User focuses the field, check if we need to remove the placeholder
     * contents.
     *
     * @param {Event} e
     */
  , focus: function focus(e) {
      var input = $(e.element)
        , value = input.get('value') || ''
        , placeholder = input.get('placeholder');

      input.set('value', value === placeholder ? '' : value);

      if ((input.get('value') || '') === placeholder) {
        input.addClass(this.className).set('type', 'text').set('readOnly', true);
      } else {
        this.readable(e);
        input.removeClass(this.className).set('type', input.get('input-type'));
      }
    }

    /**
     * The user leaves the fields, do we need to restore the placeholder
     *
     * @param {Event} e
     */
  , blur: function blur(e) {
      var input = $(e.element)
        , value = input.get('value') || ''
        , placeholder = input.get('placeholder');

      input.set('value', value === '' ? placeholder : value);

      if ((input.get('value') || '') === placeholder) {
        input.addClass(this.className).set('type', 'text').set('readOnly', true);
      } else {
        this.readable(e);
        input.removeClass(this.className).set('type', input.get('input-type'));
      }
    }
});

// Check if we need to add support for placeholders
if (!('placeholder' in document.createElement('input'))) Cortex.app('placeholder', Placeholder);

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