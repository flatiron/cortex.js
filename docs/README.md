# API documentation

---------------------------------------

### Cortex.version
<p>Expose the current version number of the Cortex Library.</p>

---------------------------------------

### Cortex.noConflict(selector _Boolean_)
<p>Simple conflict handling if we are overriding the $ or other Cortex<br />instances. Basically, if you need this function you are doing something<br />wrong.</p>

#### Arguments

- **selector** _Boolean_ $ selector only

---------------------------------------

### Cortex.is(type _Mixed_, expected _String_)
<p>Simple type checking.</p>

#### Arguments

- **type** _Mixed_ 
- **expected** _String_ 

---------------------------------------

### Cortex.forEach(collection _Mixed_, iterator _Function_, context _Mixed_)
<p>Cortex.forEach is a simple iterator. Iterations should be delegated to the<br />Native functions when ever possible.</p>

#### Arguments

- **collection** _Mixed_ 
- **iterator** _Function_ 
- **context** _Mixed_ 

---------------------------------------

### Cortex.filter(collection _Mixed_, iterator _Function_, context _Mixed_)
<p>Cortex.filter returns all elements that pass the truth test. Filtering<br />should be delegated to native function when ever possible.</p>

#### Arguments

- **collection** _Mixed_ 
- **iterator** _Function_ 
- **context** _Mixed_ 

---------------------------------------

### Cortex.map(collection _Mixed_, iterator _Function_, context _Mixed_)
<p>Cortex.map returns the results of applying the iterator to each item in the<br />collection.</p>

#### Arguments

- **collection** _Mixed_ 
- **iterator** _Function_ 
- **context** _Mixed_ 

---------------------------------------

### Cortex.matchesSelector(selector _String_, element _DOM_)
<p>MatchesSelector, simple checking if a DOM element matches a certain CSS<br />selector. This method is used internally for Event Listening.</p>

#### Arguments

- **selector** _String_ 
- **element** _DOM_ 

---------------------------------------

### Cortex.extend(obj _Object_)
<p>Extend the given object with all the properties of the supplied arguments.</p>

#### Arguments

- **obj** _Object_ the base object that needs to be extended with all args

---------------------------------------

### Cortex.property(obj _Object_, prop _String_)
<p>Helper function to get the value from an object as property. If the<br />property is a function it will be executed instead.</p>

#### Arguments

- **obj** _Object_ 
- **prop** _String_ 

---------------------------------------

### Cortex.EventEmitter
<p>Cortex.EventEmitter is heavily influenced by the Node.js EventEmitter<br />module and the regular Observer pattern. It does have some level of<br />compatibility with the Node.js EventEmitter but don't depend on the same<br />behaviour, the API's are just the same.</p>

---------------------------------------

### Cortex.on(events _String_, callback _Function_, context _Mixed_)
<p>Adds an event listener.</p>

#### Arguments

- **events** _String_ space separated list of events to listen on
- **callback** _Function_ 
- **context** _Mixed_ 

---------------------------------------

### Cortex.off(event _String_, callback _Function_, context _Mixed_)
<p>Removes attached event listeners. If no arguments are supplied it will<br />remove all the assigned events. If no callback is supplied it will<br />remove all listeners for the specified events. If no context is<br />provided it will remove all event listeners that have the supplied<br />callback.</p>

#### Arguments

- **event** _String_ 
- **callback** _Function_ 
- **context** _Mixed_ 

---------------------------------------

### Cortex.remove(handle _Function_)
<p>Helper function to filter out the <code>this.events</code> array</p>

#### Arguments

- **handle** _Function_ the callback of the event

---------------------------------------

### Cortex.emit(event _String_)
<p>Call the supplied event listeners with all the supplied arguments.</p>

#### Arguments

- **event** _String_ 

---------------------------------------

### Cortex.once(event _String_, callback _Function_, context _Mixed_)
<p>Create a listeners that is only called once.</p>


#### Arguments

- **event** _String_ 
- **callback** _Function_ 
- **context** _Mixed_ 

---------------------------------------

### Cortex.enable()
<p>Enable the EventEmitter.</p>

---------------------------------------

### Cortex.disable()
<p>Disable the EventEmitter.</p>

---------------------------------------

### Cortex.Structure
<p>The Cortex.Structure</p>

<p>The Cortex Model is a light-weight implementation of the Backbone.js model<br />and is designed to be used a wrapper for the DOM and for Objects so we have<br />one single universal structure for all operations. Which will hopefully help<br />us to keep our code sane.</p>

---------------------------------------

### Structure.get(attr _String_)
<p>Get attributes from the structure</p>

#### Arguments

- **attr** _String_ 

---------------------------------------

### Structure.has(attr _String_)
<p>See if we have this attribute. We use the #get method for checking as<br />it's easier to extend the structure this way.</p>

#### Arguments

- **attr** _String_ 

---------------------------------------

### Structure.set(key _String_, value _Mixed_, options _Object_)
<p>Set new attributes in the structure.</p>

#### Arguments

- **key** _String_ 
- **value** _Mixed_ 
- **options** _Object_ 

---------------------------------------

### Structure.remove(attr _String_)
<p>Remove attributes from the structure.</p>

#### Arguments

- **attr** _String_ 

---------------------------------------

### Structure.clear()
<p>Clear all attributes of the structure.</p>

---------------------------------------

### Structure.clone()
<p>Create a new clone of the model that is identical to this one.</p>

---------------------------------------

### Structure.previous(attr _String_)
<p>Get the previous attributes.</p>

#### Arguments

- **attr** _String_ attribute that we want the old value from.

---------------------------------------

### Structure.parse(obj _Object_)
<p>Parse converts the given attributes of an Structure to an Object.</p>

#### Arguments

- **obj** _Object_ 

---------------------------------------

### Structure.plain(index _Mixed_, options _Object_)
<p>Transform the Model to a regular plain JavaScript structure.</p>


#### Arguments

- **index** _Mixed_ the index of the array or key that it should return
- **options** _Object_ 

---------------------------------------

### Cortex.Collection(structures _Array_, options _Object_)
<p>Cortex.Collection:</p>

<p>Provides a standard collection class for a set of Structure.</p>

#### Arguments

- **structures** _Array_ 
- **options** _Object_ 

---------------------------------------

### Collection.structure
<p>The default structure for a collection is just a plain Structure</p>

---------------------------------------

### Collection.plain(index _Mixed_, options _Object_)
<p>Transform the collection in a plain object structure.</p>

#### Arguments

- **index** _Mixed_ 
- **options** _Object_ 

---------------------------------------

### Collection.add(structures _Mixed_, options _Object_)
<p>Add a new Structure or an Array of Structures to the collections.</p>

#### Arguments

- **structures** _Mixed_ 
- **options** _Object_ 

---------------------------------------

### Collection.remove(structures _Mixed_, options _Object_)
<p>Removes a structure from the collection.</p>

#### Arguments

- **structures** _Mixed_ 
- **options** _Object_ 

---------------------------------------

### Collection.has(obj _Mixed_, options _Object_)
<p>Checks if the Collection has the given structure.</p>

#### Arguments

- **obj** _Mixed_ 
- **options** _Object_ 

---------------------------------------

### Collection.get(id _Mixed_)
<p>Get a structure by id.</p>

#### Arguments

- **id** _Mixed_ 

---------------------------------------

### Collection.prepare(structure _Mixed_, options _Object_)
<p>Prepare a structure so it can be used in a Collection context, if we<br />don't receive a Structure instance we are going to generate a new one.</p>

#### Arguments

- **structure** _Mixed_ 
- **options** _Object_ 

---------------------------------------

### Collection.parse(obj _Array_)
<p>Parse the data that is added to the to collection</p>

#### Arguments

- **obj** _Array_ 

---------------------------------------

### Collection.{forEach, each, map, collect, filter, select}
<p>Assign Cortex methods that we want to assign to our collection.</p>

---------------------------------------

### Cortex.View(options _Object_)
<p>Cortex.View:</p>

<p>A simple application view handler.</p>

#### Arguments

- **options** _Object_ 

---------------------------------------

### View.selector
<p>The default selector that we should create if we don't have a Node<br />reference.</p>

---------------------------------------

### View.delegated
<p>Event delegated.</p>

---------------------------------------

### View.$(selector _String_)
<p>Find new elements</p>

#### Arguments

- **selector** _String_ 

---------------------------------------

### View.template(name _String_, data _Object_)
<p>Provides an alternate syntax for plates which provides you with<br />a chained syntax:</p>

```js
this.template('name', data).where('href').has('/bar').insert('newurl');
```

#### Arguments

- **name** _String_ name of the template file
- **data** _Object_ data for the template

---------------------------------------

### Cortex.Node
<p>Cortex.Node:</p>

<p>Cortex.Node is an DOM interface allows us to create a universal interface<br />between the DOM and our application code. This is where can add support for<br />different DOM operations such as a <code>css</code> method etc.</p>

---------------------------------------

### Node.get(attr _String_)
<p>Get attributes attributes from the given Node instance.</p>

#### Arguments

- **attr** _String_ 

---------------------------------------

### Node.set(key _String_, value _String_, options _Object_)
<p>Set's new attributes on the Node instance, if an element doesn't<br />support it, it should should really be added as data-attribute.</p>

- **key** _String_ Attribute that should be updated
- **value** _String_ The value that should be set
- **options** _Object_

---------------------------------------

### Node.factory(dom _String_)
<p>Generate an actual DOM element from a string.</p>


#### Arguments

- **dom** _String_ 

---------------------------------------

### Node.destroy()
<p>Destroy the structure.</p>

---------------------------------------

<p>This is where the syntax sugar starts. If you want to interact with the<br />DOM in any way this is the spot where you would want to be.</p>

<p>Make sure that every single function that is specified here returns<br /><code>this</code> so we can chain different methods together.</p>

---------------------------------------

### Node.show()
<p>Show the DOM element.</p>

---------------------------------------

### Node.hide()
<p>Hide the DOM element.</p>

---------------------------------------

### Node.addClass(className _String_)
<p>Added classNames</p>

#### Arguments

- **className** _String_ 

---------------------------------------

### Node.removeClass(className _String_)
<p>remove className.</p>

#### Arguments

- **className** _String_ 

---------------------------------------

### Cortex.Nodelist
<p>Cortex.Nodelist:</p>

<p>A simple representation of a Node collection.</p>

---------------------------------------

### Nodelist.structure
<p>The default Structure that should be created.</p>
<p>Defaults to Node</p>

---------------------------------------

### Nodelist.selector
<p>The selector that was used to generate this Nodelist</p>

---------------------------------------

### Nodelist.find(selector _String_)
<p>Generate a new Nodelist instance with the matching Nodes.</p>

#### Arguments

- **selector** _String_ 

---------------------------------------

### Nodelist.end()
<p>End a chained .find() method by returning it's wrapping parent Nodelist</p>

---------------------------------------

### Nodelist.parent(selector _String_)
<p>Find the parent of the element.</p>


#### Arguments

- **selector** _String_ optional selector to that it should match

---------------------------------------

### Nodelist.{show, hide, addClass, removeClass, get, set, destroy}
<p>Generate proxy methods to the Node structure</p>

---------------------------------------

### Cortex.Events
<p>Cortex.Events:</p>

<p>Cortex.Events takes care of all the DOM event handling. All events DOM<br />events eventually bubble down to the documentElement where they are<br />captured and checked against CSS selectors for events that are listening.</p>

---------------------------------------

### Events.listeners
<p>Simple dictionary that contains all our listeners.</p>

---------------------------------------

### Events.add(type _String_, selectors _String_, callback _Function_, context _Mixed_)
<p>Add a new event listener.</p>

#### Arguments

- **type** _String_ event type, click, dbclick, keydown etc.
- **selectors** _String_ CSS3 selector that matches the element
- **callback** _Function_ 
- **context** _Mixed_ 

---------------------------------------

### Events.remove(type _String_, selectors _String_, callback _Function_)
<p>Remove the listeners again.</p>

#### Arguments

- **type** _String_ event type, click, dbclick, keydown etc.
- **selectors** _String_ CSS3 selector that matches the element
- **callback** _Function_ 

---------------------------------------

### Cortex.push(name _String_, library _Mixed_)
<p>Cortex.push() allows us to load library files comply async, if Cortex does<br />not yet exist in the global scope it would be set to an array where the<br />functions will be pushed. So when this "main" library is loaded in, it will<br />search for all old Cortex instances and execute it.</p>

#### Arguments

- **name** _String_ the name of the library
- **library** _Mixed_ either a string or a function.

---------------------------------------

### $ = Cortex.find(selector _String_, context _DOM_)
<p>Simple CSS3 selector engine targeted for the high-end browsers. By using<br />our own interface it's relatively easy to hook in optional support for<br />different browsers.</p>

#### Arguments

- **selector** _String_ 
- **context** _DOM_ optional context

---------------------------------------

### Cortex.active(fn _Function_)
<p>Application framework bootstrapper. It scans the current document for<br />cerebral/cortex script types and parses them as JSON which will be used as<br />application configuration.</p>

#### Arguments

- **fn** _Function_ the callback for when the cortex has become active

---------------------------------------

### Cortex.app(name _String_, instance _Function_, options _Object_)
<p>Create a new Cortex application once everything is loaded correctly.</p>

#### Arguments

- **name** _String_ name of the application
- **instance** _Function_ constructor of the application
- **options** _Object_ optional options for the app.
