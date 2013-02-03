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
