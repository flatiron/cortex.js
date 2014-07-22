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
