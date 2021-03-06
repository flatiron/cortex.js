/* [square] Bundle: /lib/cortex.js */
/*globals Plates */
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
       * Collection of HTML entities used to escape characters in a string.
       *
       * @type {Object}
       * @api public
       */
    , entityMap: {
          '&': '&amp;'
        , '<': '&lt;'
        , '>': '&gt;'
        , '"': '&quot;'
        , "'": '&#39;'
        , '/': '&#x2F;'
      }

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
       * Convenience method to escape output of the string.
       *
       * @param {String} string
       * @return {String} escaped string
       * @api public
       */
    , escape: function escape(string) {
        var entityMap = this.entityMap;
        return String(string).replace(/[&<>"'\/]/g, function (s) {
          return entityMap[s];
        });
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

    function instantly () {
      Cortex.active(function (err, configuration) {
        if (app[name] || err) return;

        options = Cortex.extend(options || {}, configuration[name] || configuration);
        var instance = app[name] = new Instance(options);

        // notify the application that it has been loaded as a cortex app.
        if ('emit' in instance) instance.emit('cortex:app', options);
      });
    }

    if (options && options.once) {
      Cortex.active.once(options.once, instantly);
    } else {
      instantly();
    }

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

  /* [square] Directive: /home/swaagie/projects/cortex.js/node_modules/plates/lib/plates.js */
var Plates = (typeof module !== 'undefined' && 'id' in module && typeof exports !== 'undefined') ? exports : {};

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

    return result !== undefined ? result : data[key];
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
    attr: /([\-\w]*)\s*=\s*(?:(["\'])([\-\.\w\s\/:;&#]*)\2)/gi,

    //
    // In HTML5 it's allowed to have to use self closing tags without closing
    // separators. So we need to detect these elements based on the tag name.
    //
    selfClosing: /^(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/,

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
    // #### @map {Object} attribute mappings
    //
    // Iterate over over the supplied HTML.
    //
    iterate: function iterate(html, value, components, tagname, key, map) {
      var output  = '',
          segment = matchClosing(components.input, tagname, html),
          data = {};

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

      html = (html || '').toString();
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

                tagbody = tagbody.replace(this.attr, function(str, key, q, value, a) {
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
              tagbody.replace(this.attr, function (attr, key, q, value, idx) {
                if (key === map && map.conf.where || 'id' && data[value]) {
                  var v = data[value],
                      nest = Array.isArray(v),
                      output = nest || typeof v === 'object'
                        ? that.iterate(html.substr(left), v, components, tagname, value, map)
                        : v;

                  // If the item is an array, then we need to tell
                  // Plates that we're dealing with nests
                  if (nest) { that.nest.push(tagname); }

                  buffer += nest ? output : tagbody + output;
                  matchmode = true;
                }
              });
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
  /* [square] Directive: /home/swaagie/projects/cortex.js/node_modules/reqwest/reqwest.js */
/*!
  * Reqwest! A general purpose XHR connection manager
  * license MIT (c) Dustin Diaz 2014
  * https://github.com/ded/reqwest
  */

!function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
}('reqwest', this, function () {

  var win = window
    , doc = document
    , twoHundo = /^(20\d|1223)$/
    , byTag = 'getElementsByTagName'
    , readyState = 'readyState'
    , contentType = 'Content-Type'
    , requestedWith = 'X-Requested-With'
    , head = doc[byTag]('head')[0]
    , uniqid = 0
    , callbackPrefix = 'reqwest_' + (+new Date())
    , lastValue // data stored by the most recent JSONP callback
    , xmlHttpRequest = 'XMLHttpRequest'
    , xDomainRequest = 'XDomainRequest'
    , noop = function () {}

    , isArray = typeof Array.isArray == 'function'
        ? Array.isArray
        : function (a) {
            return a instanceof Array
          }

    , defaultHeaders = {
          'contentType': 'application/x-www-form-urlencoded'
        , 'requestedWith': xmlHttpRequest
        , 'accept': {
              '*':  'text/javascript, text/html, application/xml, text/xml, */*'
            , 'xml':  'application/xml, text/xml'
            , 'html': 'text/html'
            , 'text': 'text/plain'
            , 'json': 'application/json, text/javascript'
            , 'js':   'application/javascript, text/javascript'
          }
      }

    , xhr = function(o) {
        // is it x-domain
        if (o['crossOrigin'] === true) {
          var xhr = win[xmlHttpRequest] ? new XMLHttpRequest() : null
          if (xhr && 'withCredentials' in xhr) {
            return xhr
          } else if (win[xDomainRequest]) {
            return new XDomainRequest()
          } else {
            throw new Error('Browser does not support cross-origin requests')
          }
        } else if (win[xmlHttpRequest]) {
          return new XMLHttpRequest()
        } else {
          return new ActiveXObject('Microsoft.XMLHTTP')
        }
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
        if (twoHundo.test(r.request.status)) success(r.request)
        else
          error(r.request)
      }
    }
  }

  function setHeaders(http, o) {
    var headers = o['headers'] || {}
      , h

    headers['Accept'] = headers['Accept']
      || defaultHeaders['accept'][o['type']]
      || defaultHeaders['accept']['*']

    var isAFormData = typeof FormData === "function" && (o['data'] instanceof FormData);
    // breaks cross-origin requests with legacy browsers
    if (!o['crossOrigin'] && !headers[requestedWith]) headers[requestedWith] = defaultHeaders['requestedWith']
    if (!headers[contentType] && !isAFormData) headers[contentType] = o['contentType'] || defaultHeaders['contentType']
    for (h in headers)
      headers.hasOwnProperty(h) && 'setRequestHeader' in http && http.setRequestHeader(h, headers[h])
  }

  function setCredentials(http, o) {
    if (typeof o['withCredentials'] !== 'undefined' && typeof http.withCredentials !== 'undefined') {
      http.withCredentials = !!o['withCredentials']
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
      , cbkey = o['jsonpCallback'] || 'callback' // the 'callback' key
      , cbval = o['jsonpCallbackName'] || reqwest.getcallbackPrefix(reqId)
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
      , method = (o['method'] || 'GET').toUpperCase()
      , url = typeof o === 'string' ? o : o['url']
      // convert non-string objects to query-string form unless o['processData'] is false
      , data = (o['processData'] !== false && o['data'] && typeof o['data'] !== 'string')
        ? reqwest.toQueryString(o['data'])
        : (o['data'] || null)
      , http
      , sendWait = false

    // if we're working on a GET request and we have data then we should append
    // query string to end of URL and not post data
    if ((o['type'] == 'jsonp' || method == 'GET') && data) {
      url = urlappend(url, data)
      data = null
    }

    if (o['type'] == 'jsonp') return handleJsonp(o, fn, err, url)

    // get the xhr from the factory if passed
    // if the factory returns null, fall-back to ours
    http = (o.xhr && o.xhr(o)) || xhr(o)

    http.open(method, url, o['async'] === false ? false : true)
    setHeaders(http, o)
    setCredentials(http, o)
    if (win[xDomainRequest] && http instanceof win[xDomainRequest]) {
        http.onload = fn
        http.onerror = err
        // NOTE: see
        // http://social.msdn.microsoft.com/Forums/en-US/iewebdevelopment/thread/30ef3add-767c-4436-b8a9-f1ca19b4812e
        http.onprogress = function() {}
        sendWait = true
    } else {
      http.onreadystatechange = handleReadyState(this, fn, err)
    }
    o['before'] && o['before'](http)
    if (sendWait) {
      setTimeout(function () {
        http.send(data)
      }, 200)
    } else {
      http.send(data)
    }
    return http
  }

  function Reqwest(o, fn) {
    this.o = o
    this.fn = fn

    init.apply(this, arguments)
  }

  function setType(header) {
    // json, javascript, text/plain, text/html, xml
    if (header.match('json')) return 'json'
    if (header.match('javascript')) return 'js'
    if (header.match('text')) return 'html'
    if (header.match('xml')) return 'xml'
  }

  function init(o, fn) {

    this.url = typeof o == 'string' ? o : o['url']
    this.timeout = null

    // whether request has been fulfilled for purpose
    // of tracking the Promises
    this._fulfilled = false
    // success handlers
    this._successHandler = function(){}
    this._fulfillmentHandlers = []
    // error handlers
    this._errorHandlers = []
    // complete (both success and fail) handlers
    this._completeHandlers = []
    this._erred = false
    this._responseArgs = {}

    var self = this

    fn = fn || function () {}

    if (o['timeout']) {
      this.timeout = setTimeout(function () {
        self.abort()
      }, o['timeout'])
    }

    if (o['success']) {
      this._successHandler = function () {
        o['success'].apply(o, arguments)
      }
    }

    if (o['error']) {
      this._errorHandlers.push(function () {
        o['error'].apply(o, arguments)
      })
    }

    if (o['complete']) {
      this._completeHandlers.push(function () {
        o['complete'].apply(o, arguments)
      })
    }

    function complete (resp) {
      o['timeout'] && clearTimeout(self.timeout)
      self.timeout = null
      while (self._completeHandlers.length > 0) {
        self._completeHandlers.shift()(resp)
      }
    }

    function success (resp) {
      var type = o['type'] || setType(resp.getResponseHeader('Content-Type'))
      resp = (type !== 'jsonp') ? self.request : resp
      // use global data filter on response text
      var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type)
        , r = filteredResponse
      try {
        resp.responseText = r
      } catch (e) {
        // can't assign this in IE<=8, just ignore
      }
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
      self._successHandler(resp)
      while (self._fulfillmentHandlers.length > 0) {
        resp = self._fulfillmentHandlers.shift()(resp)
      }

      complete(resp)
    }

    function error(resp, msg, t) {
      resp = self.request
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
        this._responseArgs.resp = success(this._responseArgs.resp)
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
  , catch: function (fn) {
      return this.fail(fn)
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
          if (o && !o['disabled'])
            cb(n, normalize(o['attributes']['value'] && o['attributes']['value']['specified'] ? o['value'] : o['text']))
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
      for (i = 0; o && i < o.length; i++) add(o[i]['name'], o[i]['value'])
    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in o) {
        if (o.hasOwnProperty(prefix)) buildParams(prefix, o[prefix], traditional, add)
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
      o['type'] && (o['method'] = o['type']) && delete o['type']
      o['dataType'] && (o['type'] = o['dataType'])
      o['jsonpCallback'] && (o['jsonpCallbackName'] = o['jsonpCallback']) && delete o['jsonpCallback']
      o['jsonp'] && (o['jsonpCallback'] = o['jsonp'])
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
  /* [square] Directive: /home/swaagie/projects/cortex.js/node_modules/sizzle/dist/sizzle.js */
/*!
 * Sizzle CSS Selector Engine v2.0.1-pre
 * http://sizzlejs.com/
 *
 * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-07-01
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + -(new Date()),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	strundefined = typeof undefined,
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf if we can't use a native one
	indexOf = arr.indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( documentIsHTML && !seed ) {

		// Shortcuts
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType === 9 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== strundefined && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare,
		doc = node ? node.ownerDocument || node : preferredDoc,
		parent = doc.defaultView;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", function() {
				setDocument();
			}, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", function() {
				setDocument();
			});
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [ m ] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== strundefined ) {
				return context.getElementsByTagName( tag );
			}
		} :
		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select msallowcapture=''><option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( div.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is no seed and only one group
	if ( match.length === 1 ) {

		// Take a shortcut and set the context if the root selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				support.getById && context.nodeType === 9 && documentIsHTML &&
				Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

// EXPOSE
if ( typeof define === "function" && define.amd ) {
	define(function() { return Sizzle; });
// Sizzle requires that there be a global window in Common-JS like environments
} else if ( typeof module !== "undefined" && module.exports ) {
	module.exports = Sizzle;
} else {
	window.Sizzle = Sizzle;
}
// EXPOSE

})( window );

  // Make sure that it's still accessible from the outside, and rename them to
  // sensible defaults..
  Cortex.Plates = Plates;
  Cortex.request = Cortex.reqwest;

  // Add our polyfills
  /* [square] Directive: /home/swaagie/projects/cortex.js/lib/cortex.polyfill.js */
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

        //
        // Only overrule an input type once, otherwise input[type=password]
        // would be transformed to text the second time.
        //
        if (!input.get('input-type')) {
          input.set('input-type', input.get('type') || 'text');
        }

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