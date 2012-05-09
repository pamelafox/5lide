/* Zepto v1.0rc1 - polyfill zepto event detect fx ajax form touch - zeptojs.com/license */
;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+/, '').replace(/\s+$/, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()
var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,

    // Used by `$.zepto.init` to wrap elements, text/comment nodes, document,
    // and document fragment node types.
    elementTypes = [1, 3, 8, 9, 11],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]+)$/,
    tagSelectorRE = /^[\w-]+$/,
    toString = ({}).toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function isFunction(value) { return toString.call(value) == "[object Function]" }
  function isObject(value) { return value instanceof Object }
  function isPlainObject(value) {
    var key, ctor
    if (toString.call(value) !== "[object Object]") return false
    ctor = (isFunction(value.constructor) && value.constructor.prototype)
    if (!ctor || !hasOwnProperty.call(ctor, 'isPrototypeOf')) return false
    for (key in value);
    return key === undefined || hasOwnProperty.call(value, key)
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return array.filter(function(item){ return item !== undefined && item !== null }) }
  function flatten(array) { return array.length > 0 ? [].concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return array.filter(function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name) {
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'
    var container = containers[name]
    container.innerHTML = '' + html
    return $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = arguments.callee.prototype
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // if a JavaScript object is given, return a copy of it
      // this is a somewhat peculiar option, but supported by
      // jQuery so we'll do it, too
      else if (isPlainObject(selector))
        dom = [$.extend({}, selector)], selector = null
      // wrap stuff like `document` or `window`
      else if (elementTypes.indexOf(selector.nodeType) >= 0 || selector === window)
        dom = [selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, whichs makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    slice.call(arguments, 1).forEach(function(source) {
      for (key in source)
        if (source[key] !== undefined)
          target[key] = source[key]
    })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (element === document && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : emptyArray ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? emptyArray :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  function funcArg(context, arg, idx, payload) {
   return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  $.isFunction = isFunction
  $.isObject = isObject
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $.map(this, function(el, i){ return fn.call(el, i, el) })
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      this.forEach(function(el, idx){ callback.call(el, idx, el) })
      return this
    },
    filter: function(selector){
      return $([].filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result
      if (this.length == 1) result = zepto.qsa(this[0], selector)
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return $(result)
    },
    closest: function(selector, context){
      var node = this[0]
      while (node && !zepto.matches(node, selector))
        node = node !== context && node !== document && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && node !== document && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return slice.call(this.children) }), selector)
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return slice.call(el.parentNode.children).filter(function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return this.map(function(){ return this[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(newContent){
      return this.each(function(){
        $(this).wrapAll($(newContent)[0].cloneNode(false))
      })
    },
    wrapAll: function(newContent){
      if (this[0]) {
        $(this[0]).before(newContent = $(newContent))
        newContent.append(this)
      }
      return this
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return $(this.map(function(){ return this.cloneNode(true) }))
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return (setting === undefined ? this.css("display") == "none" : setting) ? this.show() : this.hide()
    },
    prev: function(){ return $(this.pluck('previousElementSibling')) },
    next: function(){ return $(this.pluck('nextElementSibling')) },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) this.setAttribute(key, name[key])
          else this.setAttribute(name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ if (this.nodeType === 1) this.removeAttribute(name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] ? this[0][name] : undefined) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? data : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this.length > 0 ? this[0].value : undefined) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(){
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: obj.width,
        height: obj.height
      }
    },
    css: function(property, value){
      if (value === undefined && typeof property == 'string')
        return (
          this.length == 0
            ? undefined
            : this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      for (key in property)
        if(typeof property[key] == 'string' && property[key] == '')
          this.each(function(){ this.style.removeProperty(dasherize(key)) })
        else
          css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'

      if (typeof property == 'string')
        if (value == '')
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      if (this.length < 1) return false
      else return classRE(name).test(this[0].className)
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = this.className, newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && (this.className += (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined)
          return this.className = ''
        classList = this.className
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        this.className = classList.trim()
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var newName = funcArg(this, name, idx, this.className)
        ;(when === undefined ? !$(this).hasClass(newName) : when) ?
          $(this).addClass(newName) : $(this).removeClass(newName)
      })
    }
  }

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return this[0] == window ? window['inner' + Dimension] :
        this[0] == document ? document.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        var el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function insert(operator, target, node) {
    var parent = (operator % 2) ? target : target.parentNode
    parent ? parent.insertBefore(node,
      !operator ? target.nextSibling :      // after
      operator == 1 ? parent.firstChild :   // prepend
      operator == 2 ? target :              // before
      null) :                               // append
      $(node).remove()
  }

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(key, operator) {
    $.fn[key] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var nodes = $.map(arguments, function(n){ return isObject(n) ? n : zepto.fragment(n) })
      if (nodes.length < 1) return this
      var size = this.length, copyByClone = size > 1, inReverse = operator < 2

      return this.each(function(index, target){
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[inReverse ? nodes.length-i-1 : i]
          traverseNode(node, function(node){
            if (node.nodeName != null && node.nodeName.toUpperCase() === 'SCRIPT' && (!node.type || node.type === 'text/javascript'))
              window['eval'].call(window, node.innerHTML)
          })
          if (copyByClone && index < size - 1) node = node.cloneNode(true)
          insert(operator, target, node)
        }
      })
    }

    $.fn[(operator % 2) ? key+'To' : 'insert'+(operator ? 'Before' : 'After')] = function(html){
      $(html)[key](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.camelize = camelize
  zepto.uniq = uniq
  $.zepto = zepto

  return $
})()

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto
'$' in window || (window.$ = Zepto)
;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={}

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.isObject(events)) $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function add(element, events, fn, selector, getDelegate, capture){
    capture = !!capture
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var delegate = getDelegate && getDelegate(fn, event),
        callback = delegate || fn
      var proxyfn = function (event) {
        var result = callback.apply(element, [event].concat(event.data))
        if (result === false) event.preventDefault()
        return result
      }
      var handler = $.extend(parse(event), {fn: fn, proxy: proxyfn, sel: selector, del: delegate, i: set.length})
      set.push(handler)
      element.addEventListener(handler.e, proxyfn, capture)
    })
  }
  function remove(element, events, fn, selector){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(handler.e, handler.proxy, false)
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var proxy = $.extend({originalEvent: event}, event)
    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    var capture = false
    if(event == 'blur' || event == 'focus'){
      if($.iswebkit)
        event = event == 'blur' ? 'focusout' : event == 'focus' ? 'focusin' : event
      else
        capture = true
    }

    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      }, capture)
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.bind(event, selector) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.unbind(event, selector) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string') event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback){ return this.bind(event, callback) }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else if (this.length) try { this.get(0)[name]() } catch(e){}
      return this
    }
  })

  $.Event = function(type, props) {
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    return event
  }

})(Zepto)
;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/)

    // todo clean this up with a better OS/browser
    // separation. we need to discern between multiple
    // browsers on android, and decide if kindle fire in
    // silk mode is android or not

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)
;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    clearProperties = {}

  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  clearProperties[prefix + 'transition-property'] =
  clearProperties[prefix + 'transition-duration'] =
  clearProperties[prefix + 'transition-timing-function'] =
  clearProperties[prefix + 'animation-name'] =
  clearProperties[prefix + 'animation-duration'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = duration / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var transforms, cssProperties = {}, key, that = this, wrappedCallback, endEvent = $.fx.transitionEnd
    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssProperties[prefix + 'animation-name'] = properties
      cssProperties[prefix + 'animation-duration'] = duration + 's'
      endEvent = $.fx.animationEnd
    } else {
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) {
          transforms || (transforms = [])
          transforms.push(key + '(' + properties[key] + ')')
        }
        else cssProperties[key] = properties[key]

      if (transforms) cssProperties[prefix + 'transform'] = transforms.join(' ')
      if (!$.fx.off && typeof properties === 'object') {
        cssProperties[prefix + 'transition-property'] = Object.keys(properties).join(', ')
        cssProperties[prefix + 'transition-duration'] = duration + 's'
        cssProperties[prefix + 'transition-timing-function'] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, arguments.callee)
      }
      $(this).css(clearProperties)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    setTimeout(function() {
      that.css(cssProperties)
      if (duration <= 0) setTimeout(function() {
        that.each(function(){ wrappedCallback.call(this) })
      }, 0)
    }, 0)

    return this
  }

  testEl = null
})(Zepto)
;(function($){
  var jsonpID = 0,
      isObject = $.isObject,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      abort = function(){
        $(script).remove()
        if (callbackName in window) window[callbackName] = empty
        ajaxComplete('abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (options.error) script.onerror = function() {
      xhr.abort()
      options.error()
    }

    window[callbackName] = function(data){
      clearTimeout(abortTimeout)
      $(script).remove()
      delete window[callbackName]
      ajaxSuccess(data, xhr, options)
    }

    serializeData(options)
    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.abort()
        ajaxComplete('timeout', xhr, options)
      }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0
  }

  function mimeToDataType(mime) {
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (isObject(options.data)) options.data = $.param(options.data)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = $.ajaxSettings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : JSON.parse(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, 'error', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  $.get = function(url, success){ return $.ajax({ url: url, success: success }) }

  $.post = function(url, data, success, dataType){
    if ($.isFunction(data)) dataType = dataType || success, success = data, data = null
    return $.ajax({ type: 'POST', url: url, data: data, success: success, dataType: dataType })
  }

  $.getJSON = function(url, success){
    return $.ajax({ url: url, success: success, dataType: 'json' })
  }

  $.fn.load = function(url, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector
    if (parts.length > 1) url = parts[0], selector = parts[1]
    $.get(url, function(response){
      self.html(selector ?
        $(document.createElement('div')).html(response.replace(rscript, "")).find(selector).html()
        : response)
      success && success.call(self)
    })
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var array = $.isArray(obj)
    $.each(obj, function(key, value) {
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (traditional ? $.isArray(value) : isObject(value))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace('%20', '+')
  }
})(Zepto)
;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)
;(function($){
  var touch = {}, touchTimeout

  function parentIfText(node){
    return 'tagName' in node ? node : node.parentNode
  }

  function swipeDirection(x1, x2, y1, y2){
    var xDelta = Math.abs(x1 - x2), yDelta = Math.abs(y1 - y2)
    return xDelta >= yDelta ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  var longTapDelay = 750, longTapTimeout

  function longTap(){
    longTapTimeout = null
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  function cancelLongTap(){
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  $(document).ready(function(){
    var now, delta

    $(document.body).bind('touchstart', function(e){
      now = Date.now()
      delta = now - (touch.last || now)
      touch.el = $(parentIfText(e.touches[0].target))
      touchTimeout && clearTimeout(touchTimeout)
      touch.x1 = e.touches[0].pageX
      touch.y1 = e.touches[0].pageY
      if (delta > 0 && delta <= 250) touch.isDoubleTap = true
      touch.last = now
      longTapTimeout = setTimeout(longTap, longTapDelay)
    }).bind('touchmove', function(e){
      cancelLongTap()
      touch.x2 = e.touches[0].pageX
      touch.y2 = e.touches[0].pageY
    }).bind('touchend', function(e){
       cancelLongTap()

      // double tap (tapped twice within 250ms)
      if (touch.isDoubleTap) {
        touch.el.trigger('doubleTap')
        touch = {}

      // swipe
      } else if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                 (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30)) {
        touch.el.trigger('swipe') &&
          touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
        touch = {}

      // normal tap
      } else if ('last' in touch) {
        touch.el.trigger('tap')

        touchTimeout = setTimeout(function(){
          touchTimeout = null
          touch.el.trigger('singleTap')
          touch = {}
        }, 250)
      }
    }).bind('touchcancel', function(){
      if (touchTimeout) clearTimeout(touchTimeout)
      if (longTapTimeout) clearTimeout(longTapTimeout)
      longTapTimeout = touchTimeout = null
      touch = {}
    })
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown', 'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(m){
    $.fn[m] = function(callback){ return this.bind(m, callback) }
  })
})(Zepto)
(function($) {
  $.support = {
    opacity: true
  };

  Event.prototype.isDefaultPrevented = function() {
    return this.defaultPrevented;
  };
  
})(Zepto);
//     Zepto.js
//     (c) 2010-2012 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

// The following code is heavily inspired by jQuery's $.fn.data()

;(function($) {
  var data = {}, dataAttr = $.fn.data, camelize = $.zepto.camelize,
    exp = $.expando = 'Zepto' + (+new Date())

  // Get value from node:
  // 1. first try key as given,
  // 2. then try camelized key,
  // 3. fall back to reading "data-*" attribute.
  function getData(node, name) {
    var id = node[exp], store = id && data[id]
    if (name === undefined) return store || setData(node)
    else {
      if (store) {
        if (name in store) return store[name]
        var camelName = camelize(name)
        if (camelName in store) return store[camelName]
      }
      return dataAttr.call($(node), name)
    }
  }

  // Store value under camelized key on node
  function setData(node, name, value) {
    var id = node[exp] || (node[exp] = ++$.uuid),
      store = data[id] || (data[id] = attributeData(node))
    if (name !== undefined) store[camelize(name)] = value
    return store
  }

  // Read all "data-*" attributes from a node
  function attributeData(node) {
    var store = {}
    $.each(node.attributes, function(i, attr){
      if (attr.name.indexOf('data-') == 0)
        store[camelize(attr.name.replace('data-', ''))] = attr.value
    })
    return store
  }

  $.fn.data = function(name, value) {
    return value === undefined ?
      // set multiple values via object
      $.isPlainObject(name) ?
        this.each(function(i, node){
          $.each(name, function(key, value){ setData(node, key, value) })
        }) :
        // get value from first element
        this.length == 0 ? undefined : getData(this[0], name) :
      // set value on all elements
      this.each(function(){ setData(this, name, value) })
  }

  $.fn.removeData = function(names) {
    if (typeof names == 'string') names = names.split(/\s+/)
    return this.each(function(){
      var id = this[exp], store = id && data[id]
      if (store) $.each(names, function(){ delete store[camelize(this)] })
    })
  }
})(Zepto)
/* ===================================================
 * bootstrap-transition.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#transitions
 * ===================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

window.jQuery = window.Zepto || window.$;

!function ($) {

  $(function () {

    "use strict"; // jshint ;_;


    /* CSS TRANSITION SUPPORT (http://www.modernizr.com/)
     * ======================================================= */

    $.support.transition = (function () {

      var transitionEnd = (function () {

        var el = document.createElement('bootstrap')
          , transEndEventNames = {
               'WebkitTransition' : 'webkitTransitionEnd'
            ,  'MozTransition'    : 'transitionend'
            ,  'OTransition'      : 'oTransitionEnd'
            ,  'msTransition'     : 'MSTransitionEnd'
            ,  'transition'       : 'transitionend'
            }
          , name

        for (name in transEndEventNames){
          if (el.style[name] !== undefined) {
            return transEndEventNames[name]
          }
        }

      }())

      return transitionEnd && {
        end: transitionEnd
      }

    })()

  })

}(window.jQuery);
/* ==========================================================
 * bootstrap-alert.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#alerts
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

  "use strict"; // jshint ;_;


 /* ALERT CLASS DEFINITION
  * ====================== */

  var dismiss = '[data-dismiss="alert"]'
    , Alert = function (el) {
        $(el).on('click', dismiss, this.close)
      }

  Alert.prototype.close = function (e) {
    var $this = $(this)
      , selector = $this.attr('data-target')
      , $parent

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
    }

    $parent = $(selector)

    e && e.preventDefault()

    $parent.length || ($parent = $this.hasClass('alert') ? $this : $this.parent())

    $parent.trigger(e = $.Event('close'))

    if (e.isDefaultPrevented()) return

    $parent.removeClass('in')

    function removeElement() {
      $parent
        .trigger('closed')
        .remove()
    }

    $.support.transition && $parent.hasClass('fade') ?
      $parent.on($.support.transition.end, removeElement) :
      removeElement()
  }


 /* ALERT PLUGIN DEFINITION
  * ======================= */

  $.fn.alert = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('alert')
      if (!data) $this.data('alert', (data = new Alert(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  $.fn.alert.Constructor = Alert


 /* ALERT DATA-API
  * ============== */

  $(function () {
    $('body').on('click.alert.data-api', dismiss, Alert.prototype.close)
  })

}(window.jQuery);/* ============================================================
 * bootstrap-button.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#buttons
 * ============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

  "use strict"; // jshint ;_;


 /* BUTTON PUBLIC CLASS DEFINITION
  * ============================== */

  var Button = function (element, options) {
    this.$element = $(element)
    this.options = $.extend({}, $.fn.button.defaults, options)
  }

  Button.prototype.setState = function (state) {
    var d = 'disabled'
      , $el = this.$element
      , data = $el.data()
      , val = $el.is('input') ? 'val' : 'html'

    state = state + 'Text'
    data.resetText || $el.data('resetText', $el[val]())

    $el[val](data[state] || this.options[state])

    // push to event loop to allow forms to submit
    setTimeout(function () {
      state == 'loadingText' ?
        $el.addClass(d).attr(d, d) :
        $el.removeClass(d).removeAttr(d)
    }, 0)
  }

  Button.prototype.toggle = function () {
    var $parent = this.$element.parent('[data-toggle="buttons-radio"]')

    $parent && $parent
      .find('.active')
      .removeClass('active')

    this.$element.toggleClass('active')
  }


 /* BUTTON PLUGIN DEFINITION
  * ======================== */

  $.fn.button = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('button')
        , options = typeof option == 'object' && option
      if (!data) $this.data('button', (data = new Button(this, options)))
      if (option == 'toggle') data.toggle()
      else if (option) data.setState(option)
    })
  }

  $.fn.button.defaults = {
    loadingText: 'loading...'
  }

  $.fn.button.Constructor = Button


 /* BUTTON DATA-API
  * =============== */

  $(function () {
    $('body').on('click.button.data-api', '[data-toggle^=button]', function ( e ) {
      var $btn = $(e.target)
      if (!$btn.hasClass('btn')) $btn = $btn.closest('.btn')
      $btn.button('toggle')
    })
  })

}(window.jQuery);/* ==========================================================
 * bootstrap-carousel.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#carousel
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

  "use strict"; // jshint ;_;


 /* CAROUSEL CLASS DEFINITION
  * ========================= */

  var Carousel = function (element, options) {
    this.$element = $(element)
    this.options = options
    this.options.slide && this.slide(this.options.slide)
    this.options.pause == 'hover' && this.$element
      .on('mouseenter', $.proxy(this.pause, this))
      .on('mouseleave', $.proxy(this.cycle, this))
  }

  Carousel.prototype = {

    cycle: function (e) {
      if (!e) this.paused = false
      this.options.interval
        && !this.paused
        && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))
      return this
    }

  , to: function (pos) {
      var $active = this.$element.find('.active')
        , children = $active.parent().children()
        , activePos = children.index($active)
        , that = this

      if (pos > (children.length - 1) || pos < 0) return

      if (this.sliding) {
        return this.$element.one('slid', function () {
          that.to(pos)
        })
      }

      if (activePos == pos) {
        return this.pause().cycle()
      }

      return this.slide(pos > activePos ? 'next' : 'prev', $(children[pos]))
    }

  , pause: function (e) {
      if (!e) this.paused = true
      clearInterval(this.interval)
      this.interval = null
      return this
    }

  , next: function () {
      if (this.sliding) return
      return this.slide('next')
    }

  , prev: function () {
      if (this.sliding) return
      return this.slide('prev')
    }

  , slide: function (type, next) {
      var $active = this.$element.find('.active')
        , $next = next || $active[type]()
        , isCycling = this.interval
        , direction = type == 'next' ? 'left' : 'right'
        , fallback  = type == 'next' ? 'first' : 'last'
        , that = this
        , e = $.Event('slide')

      this.sliding = true

      isCycling && this.pause()

      $next = $next.length ? $next : this.$element.find('.item')[fallback]()

      if ($next.hasClass('active')) return

      if ($.support.transition && this.$element.hasClass('slide')) {
        this.$element.trigger(e)
        if (e.isDefaultPrevented()) return
        $next.addClass(type)
        $next[0].offsetWidth // force reflow
        $active.addClass(direction)
        $next.addClass(direction)
        this.$element.one($.support.transition.end, function () {
          $next.removeClass([type, direction].join(' ')).addClass('active')
          $active.removeClass(['active', direction].join(' '))
          that.sliding = false
          setTimeout(function () { that.$element.trigger('slid') }, 0)
        })
      } else {
        this.$element.trigger(e)
        if (e.isDefaultPrevented()) return
        $active.removeClass('active')
        $next.addClass('active')
        this.sliding = false
        this.$element.trigger('slid')
      }

      isCycling && this.cycle()

      return this
    }

  }


 /* CAROUSEL PLUGIN DEFINITION
  * ========================== */

  $.fn.carousel = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('carousel')
        , options = $.extend({}, $.fn.carousel.defaults, typeof option == 'object' && option)
      if (!data) $this.data('carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (typeof option == 'string' || (option = options.slide)) data[option]()
      else if (options.interval) data.cycle()
    })
  }

  $.fn.carousel.defaults = {
    interval: 5000
  , pause: 'hover'
  }

  $.fn.carousel.Constructor = Carousel


 /* CAROUSEL DATA-API
  * ================= */

  $(function () {
    $('body').on('click.carousel.data-api', '[data-slide]', function ( e ) {
      var $this = $(this), href
        , $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
        , options = !$target.data('modal') && $.extend({}, $target.data(), $this.data())
      $target.carousel(options)
      e.preventDefault()
    })
  })

}(window.jQuery);/* =============================================================
 * bootstrap-collapse.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#collapse
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

  "use strict"; // jshint ;_;


 /* COLLAPSE PUBLIC CLASS DEFINITION
  * ================================ */

  var Collapse = function (element, options) {
    this.$element = $(element)
    this.options = $.extend({}, $.fn.collapse.defaults, options)

    if (this.options.parent) {
      this.$parent = $(this.options.parent)
    }

    this.options.toggle && this.toggle()
  }

  Collapse.prototype = {

    constructor: Collapse

  , dimension: function () {
      var hasWidth = this.$element.hasClass('width')
      return hasWidth ? 'width' : 'height'
    }

  , show: function () {
      var dimension
        , scroll
        , actives
        , hasData

      if (this.transitioning) return

      dimension = this.dimension()
      scroll = $.camelCase(['scroll', dimension].join('-'))
      actives = this.$parent && this.$parent.find('> .accordion-group > .in')

      if (actives && actives.length) {
        hasData = actives.data('collapse')
        if (hasData && hasData.transitioning) return
        actives.collapse('hide')
        hasData || actives.data('collapse', null)
      }

      this.$element[dimension](0)
      this.transition('addClass', $.Event('show'), 'shown')
      this.$element[dimension](this.$element[0][scroll])
    }

  , hide: function () {
      var dimension
      if (this.transitioning) return
      dimension = this.dimension()
      this.reset(this.$element[dimension]())
      this.transition('removeClass', $.Event('hide'), 'hidden')
      this.$element[dimension](0)
    }

  , reset: function (size) {
      var dimension = this.dimension()

      this.$element
        .removeClass('collapse')
        [dimension](size || 'auto')
        [0].offsetWidth

      this.$element[size !== null ? 'addClass' : 'removeClass']('collapse')

      return this
    }

  , transition: function (method, startEvent, completeEvent) {
      var that = this
        , complete = function () {
            if (startEvent.type == 'show') that.reset()
            that.transitioning = 0
            that.$element.trigger(completeEvent)
          }

      this.$element.trigger(startEvent)

      if (startEvent.isDefaultPrevented()) return

      this.transitioning = 1

      this.$element[method]('in')

      $.support.transition && this.$element.hasClass('collapse') ?
        this.$element.one($.support.transition.end, complete) :
        complete()
    }

  , toggle: function () {
      this[this.$element.hasClass('in') ? 'hide' : 'show']()
    }

  }


 /* COLLAPSIBLE PLUGIN DEFINITION
  * ============================== */

  $.fn.collapse = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('collapse')
        , options = typeof option == 'object' && option
      if (!data) $this.data('collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.collapse.defaults = {
    toggle: true
  }

  $.fn.collapse.Constructor = Collapse


 /* COLLAPSIBLE DATA-API
  * ==================== */

  $(function () {
    $('body').on('click.collapse.data-api', '[data-toggle=collapse]', function ( e ) {
      var $this = $(this), href
        , target = $this.attr('data-target')
          || e.preventDefault()
          || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') //strip for ie7
        , option = $(target).data('collapse') ? 'toggle' : $this.data()
      $(target).collapse(option)
    })
  })

}(window.jQuery);/* ============================================================
 * bootstrap-dropdown.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#dropdowns
 * ============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

  "use strict"; // jshint ;_;


 /* DROPDOWN CLASS DEFINITION
  * ========================= */

  var toggle = '[data-toggle="dropdown"]'
    , Dropdown = function (element) {
        var $el = $(element).on('click.dropdown.data-api', this.toggle)
        $('html').on('click.dropdown.data-api', function () {
          $el.parent().removeClass('open')
        })
      }

  Dropdown.prototype = {

    constructor: Dropdown

  , toggle: function (e) {
      var $this = $(this)
        , $parent
        , selector
        , isActive

      if ($this.is('.disabled, :disabled')) return

      selector = $this.attr('data-target')

      if (!selector) {
        selector = $this.attr('href')
        selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
      }

      $parent = $(selector)
      $parent.length || ($parent = $this.parent())
      isActive = $parent.hasClass('open')

      clearMenus()

      if (!isActive) {
        $parent.addClass('open')
      }

      return false
    }

  }

  function clearMenus() {
    $(toggle).parent().removeClass('open')
  }


  /* DROPDOWN PLUGIN DEFINITION
   * ========================== */

  $.fn.dropdown = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('dropdown')
      if (!data) $this.data('dropdown', (data = new Dropdown(this)))
      if (typeof option == 'string') data[option].call($this)
    })
  }

  $.fn.dropdown.Constructor = Dropdown


  /* APPLY TO STANDARD DROPDOWN ELEMENTS
   * =================================== */

  $(function () {
    //$('html').on('click.dropdown.data-api', clearMenus)
    $('body')
      .on('click.dropdown', '.dropdown form', function (e) { e.stopPropagation() })
      .on('click.dropdown.data-api', toggle, Dropdown.prototype.toggle)
  })

}(window.jQuery);/* =========================================================
 * bootstrap-modal.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#modals
 * =========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */


!function ($) {

  "use strict"; // jshint ;_;


 /* MODAL CLASS DEFINITION
  * ====================== */

  var Modal = function (content, options) {
    this.options = options
    this.$element = $(content)
      .delegate('[data-dismiss="modal"]', 'click.dismiss.modal', $.proxy(this.hide, this))
  }

  Modal.prototype = {

      constructor: Modal

    , toggle: function () {
        return this[!this.isShown ? 'show' : 'hide']()
      }

    , show: function () {
        var that = this
          , e = $.Event('show')

        this.$element.trigger(e)

        if (this.isShown || e.isDefaultPrevented()) return

        $('body').addClass('modal-open')

        this.isShown = true

        escape.call(this)
        backdrop.call(this, function () {
          var transition = $.support.transition && that.$element.hasClass('fade')

          if (!that.$element.parent().length) {
            that.$element.appendTo(document.body) //don't move modals dom position
          }

          that.$element
            .show()

          if (transition) {
            that.$element[0].offsetWidth // force reflow
          }

          that.$element.addClass('in')

          transition ?
            that.$element.one($.support.transition.end, function () { that.$element.trigger('shown') }) :
            that.$element.trigger('shown')

        })
      }

    , hide: function (e) {
        e && e.preventDefault()

        var that = this

        e = $.Event('hide')

        this.$element.trigger(e)

        if (!this.isShown || e.isDefaultPrevented()) return

        this.isShown = false

        $('body').removeClass('modal-open')

        escape.call(this)

        this.$element.removeClass('in')

        $.support.transition && this.$element.hasClass('fade') ?
          hideWithTransition.call(this) :
          hideModal.call(this)
      }

  }


 /* MODAL PRIVATE METHODS
  * ===================== */

  function hideWithTransition() {
    var that = this
      , timeout = setTimeout(function () {
          that.$element.off($.support.transition.end)
          hideModal.call(that)
        }, 500)

    this.$element.one($.support.transition.end, function () {
      clearTimeout(timeout)
      hideModal.call(that)
    })
  }

  function hideModal(that) {
    this.$element
      .hide()
      .trigger('hidden')

    backdrop.call(this)
  }

  function backdrop(callback) {
    var that = this
      , animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
        .appendTo(document.body)

      if (this.options.backdrop != 'static') {
        this.$backdrop.click($.proxy(this.hide, this))
      }

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      doAnimate ?
        this.$backdrop.one($.support.transition.end, callback) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      $.support.transition && this.$element.hasClass('fade')?
        this.$backdrop.one($.support.transition.end, $.proxy(removeBackdrop, this)) :
        removeBackdrop.call(this)

    } else if (callback) {
      callback()
    }
  }

  function removeBackdrop() {
    this.$backdrop.remove()
    this.$backdrop = null
  }

  function escape() {
    var that = this
    if (this.isShown && this.options.keyboard) {
      $(document).on('keyup.dismiss.modal', function ( e ) {
        e.which == 27 && that.hide()
      })
    } else if (!this.isShown) {
      $(document).off('keyup.dismiss.modal')
    }
  }


 /* MODAL PLUGIN DEFINITION
  * ======================= */

  $.fn.modal = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('modal')
        , options = $.extend({}, $.fn.modal.defaults, $this.data(), typeof option == 'object' && option)
      if (!data) $this.data('modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option]()
      else if (options.show) data.show()
    })
  }

  $.fn.modal.defaults = {
      backdrop: true
    , keyboard: true
    , show: true
  }

  $.fn.modal.Constructor = Modal


 /* MODAL DATA-API
  * ============== */

  $(function () {
    $('body').on('click.modal.data-api', '[data-toggle="modal"]', function ( e ) {
      var $this = $(this), href
        , $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
        , option = $target.data('modal') ? 'toggle' : $.extend({}, $target.data(), $this.data())

      e.preventDefault()
      $target.modal(option)
    })
  })

}(window.jQuery);/* ===========================================================
 * bootstrap-tooltip.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#tooltips
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ===========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

  "use strict"; // jshint ;_;


 /* TOOLTIP PUBLIC CLASS DEFINITION
  * =============================== */

  var Tooltip = function (element, options) {
    this.init('tooltip', element, options)
  }

  Tooltip.prototype = {

    constructor: Tooltip

  , init: function (type, element, options) {
      var eventIn
        , eventOut

      this.type = type
      this.$element = $(element)
      this.options = this.getOptions(options)
      this.enabled = true

      if (this.options.trigger != 'manual') {
        eventIn  = this.options.trigger == 'hover' ? 'mouseenter' : 'focus'
        eventOut = this.options.trigger == 'hover' ? 'mouseleave' : 'blur'
        this.$element.on(eventIn, this.options.selector, $.proxy(this.enter, this))
        this.$element.on(eventOut, this.options.selector, $.proxy(this.leave, this))
      }

      this.options.selector ?
        (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
        this.fixTitle()
    }

  , getOptions: function (options) {
      options = $.extend({}, $.fn[this.type].defaults, options, this.$element.data())

      if (options.delay && typeof options.delay == 'number') {
        options.delay = {
          show: options.delay
        , hide: options.delay
        }
      }

      return options
    }

  , enter: function (e) {
      var self = $(e.currentTarget)[this.type](this._options).data(this.type)

      if (!self.options.delay || !self.options.delay.show) return self.show()

      clearTimeout(this.timeout)
      self.hoverState = 'in'
      this.timeout = setTimeout(function() {
        if (self.hoverState == 'in') self.show()
      }, self.options.delay.show)
    }

  , leave: function (e) {
      var self = $(e.currentTarget)[this.type](this._options).data(this.type)

      if (!self.options.delay || !self.options.delay.hide) return self.hide()

      clearTimeout(this.timeout)
      self.hoverState = 'out'
      this.timeout = setTimeout(function() {
        if (self.hoverState == 'out') self.hide()
      }, self.options.delay.hide)
    }

  , show: function () {
      var $tip
        , inside
        , pos
        , actualWidth
        , actualHeight
        , placement
        , tp

      if (this.hasContent() && this.enabled) {
        $tip = this.tip()
        this.setContent()

        if (this.options.animation) {
          $tip.addClass('fade')
        }

        placement = typeof this.options.placement == 'function' ?
          this.options.placement.call(this, $tip[0], this.$element[0]) :
          this.options.placement

        inside = /in/.test(placement)

        $tip
          .remove()
          .css({ top: 0, left: 0, display: 'block' })
          .appendTo(inside ? this.$element : document.body)

        pos = this.getPosition(inside)

        actualWidth = $tip[0].offsetWidth
        actualHeight = $tip[0].offsetHeight

        switch (inside ? placement.split(' ')[1] : placement) {
          case 'bottom':
            tp = {top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2}
            break
          case 'top':
            tp = {top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2}
            break
          case 'left':
            tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth}
            break
          case 'right':
            tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width}
            break
        }

        $tip
          .css(tp)
          .addClass(placement)
          .addClass('in')
      }
    }

  , isHTML: function(text) {
      // html string detection logic adapted from jQuery
      return typeof text != 'string'
        || ( text.charAt(0) === "<"
          && text.charAt( text.length - 1 ) === ">"
          && text.length >= 3
        ) || /^(?:[^<]*<[\w\W]+>[^>]*$)/.exec(text)
    }

  , setContent: function () {
      var $tip = this.tip()
        , title = this.getTitle()

      $tip.find('.tooltip-inner')[this.isHTML(title) ? 'html' : 'text'](title)
      $tip.removeClass('fade in top bottom left right')
    }

  , hide: function () {
      var that = this
        , $tip = this.tip()

      $tip.removeClass('in')

      function removeWithAnimation() {
        var timeout = setTimeout(function () {
          $tip.off($.support.transition.end).remove()
        }, 500)

        $tip.one($.support.transition.end, function () {
          clearTimeout(timeout)
          $tip.remove()
        })
      }

      $.support.transition && this.$tip.hasClass('fade') ?
        removeWithAnimation() :
        $tip.remove()
    }

  , fixTitle: function () {
      var $e = this.$element
      if ($e.attr('title') || typeof($e.attr('data-original-title')) != 'string') {
        $e.attr('data-original-title', $e.attr('title') || '').removeAttr('title')
      }
    }

  , hasContent: function () {
      return this.getTitle()
    }

  , getPosition: function (inside) {
      return $.extend({}, (inside ? {top: 0, left: 0} : this.$element.offset()), {
        width: this.$element[0].offsetWidth
      , height: this.$element[0].offsetHeight
      })
    }

  , getTitle: function () {
      var title
        , $e = this.$element
        , o = this.options

      title = $e.attr('data-original-title')
        || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

      return title
    }

  , tip: function () {
      return this.$tip = this.$tip || $(this.options.template)
    }

  , validate: function () {
      if (!this.$element[0].parentNode) {
        this.hide()
        this.$element = null
        this.options = null
      }
    }

  , enable: function () {
      this.enabled = true
    }

  , disable: function () {
      this.enabled = false
    }

  , toggleEnabled: function () {
      this.enabled = !this.enabled
    }

  , toggle: function () {
      this[this.tip().hasClass('in') ? 'hide' : 'show']()
    }

  }


 /* TOOLTIP PLUGIN DEFINITION
  * ========================= */

  $.fn.tooltip = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('tooltip')
        , options = typeof option == 'object' && option
      if (!data) $this.data('tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.tooltip.Constructor = Tooltip

  $.fn.tooltip.defaults = {
    animation: true
  , placement: 'top'
  , selector: false
  , template: '<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
  , trigger: 'hover'
  , title: ''
  , delay: 0
  }

}(window.jQuery);/* ===========================================================
 * bootstrap-popover.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#popovers
 * ===========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =========================================================== */


!function ($) {

  "use strict"; // jshint ;_;


 /* POPOVER PUBLIC CLASS DEFINITION
  * =============================== */

  var Popover = function ( element, options ) {
    this.init('popover', element, options)
  }


  /* NOTE: POPOVER EXTENDS BOOTSTRAP-TOOLTIP.js
     ========================================== */

  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype, {

    constructor: Popover

  , setContent: function () {
      var $tip = this.tip()
        , title = this.getTitle()
        , content = this.getContent()

      $tip.find('.popover-title')[this.isHTML(title) ? 'html' : 'text'](title)
      $tip.find('.popover-content > *')[this.isHTML(content) ? 'html' : 'text'](content)

      $tip.removeClass('fade top bottom left right in')
    }

  , hasContent: function () {
      return this.getTitle() || this.getContent()
    }

  , getContent: function () {
      var content
        , $e = this.$element
        , o = this.options

      content = $e.attr('data-content')
        || (typeof o.content == 'function' ? o.content.call($e[0]) :  o.content)

      return content
    }

  , tip: function () {
      if (!this.$tip) {
        this.$tip = $(this.options.template)
      }
      return this.$tip
    }

  })


 /* POPOVER PLUGIN DEFINITION
  * ======================= */

  $.fn.popover = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('popover')
        , options = typeof option == 'object' && option
      if (!data) $this.data('popover', (data = new Popover(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.popover.Constructor = Popover

  $.fn.popover.defaults = $.extend({} , $.fn.tooltip.defaults, {
    placement: 'right'
  , content: ''
  , template: '<div class="popover"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>'
  })

}(window.jQuery);/* =============================================================
 * bootstrap-scrollspy.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#scrollspy
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================== */


!function ($) {

  "use strict"; // jshint ;_;


  /* SCROLLSPY CLASS DEFINITION
   * ========================== */

  function ScrollSpy( element, options) {
    var process = $.proxy(this.process, this)
      , $element = $(element).is('body') ? $(window) : $(element)
      , href
    this.options = $.extend({}, $.fn.scrollspy.defaults, options)
    this.$scrollElement = $element.on('scroll.scroll.data-api', process)
    this.selector = (this.options.target
      || ((href = $(element).attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
      || '') + ' .nav li > a'
    this.$body = $('body')
    this.refresh()
    this.process()
  }

  ScrollSpy.prototype = {

      constructor: ScrollSpy

    , refresh: function () {
        var self = this
          , $targets

        this.offsets = $([])
        this.targets = $([])

        $targets = this.$body
          .find(this.selector)
          .map(function () {
            var $el = $(this)
              , href = $el.data('target') || $el.attr('href')
              , $href = /^#\w/.test(href) && $(href)
            return ( $href
              && href.length
              && [[ $href.position().top, href ]] ) || null
          })
          .sort(function (a, b) { return a[0] - b[0] })
          .each(function () {
            self.offsets.push(this[0])
            self.targets.push(this[1])
          })
      }

    , process: function () {
        var scrollTop = this.$scrollElement.scrollTop() + this.options.offset
          , scrollHeight = this.$scrollElement[0].scrollHeight || this.$body[0].scrollHeight
          , maxScroll = scrollHeight - this.$scrollElement.height()
          , offsets = this.offsets
          , targets = this.targets
          , activeTarget = this.activeTarget
          , i

        if (scrollTop >= maxScroll) {
          return activeTarget != (i = targets.last()[0])
            && this.activate ( i )
        }

        for (i = offsets.length; i--;) {
          activeTarget != targets[i]
            && scrollTop >= offsets[i]
            && (!offsets[i + 1] || scrollTop <= offsets[i + 1])
            && this.activate( targets[i] )
        }
      }

    , activate: function (target) {
        var active
          , selector

        this.activeTarget = target

        $(this.selector)
          .parent('.active')
          .removeClass('active')

        selector = this.selector
          + '[data-target="' + target + '"],'
          + this.selector + '[href="' + target + '"]'

        active = $(selector)
          .parent('li')
          .addClass('active')

        if (active.parent('.dropdown-menu'))  {
          active = active.closest('li.dropdown').addClass('active')
        }

        active.trigger('activate')
      }

  }


 /* SCROLLSPY PLUGIN DEFINITION
  * =========================== */

  $.fn.scrollspy = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('scrollspy')
        , options = typeof option == 'object' && option
      if (!data) $this.data('scrollspy', (data = new ScrollSpy(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.scrollspy.Constructor = ScrollSpy

  $.fn.scrollspy.defaults = {
    offset: 10
  }


 /* SCROLLSPY DATA-API
  * ================== */

  $(function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this)
      $spy.scrollspy($spy.data())
    })
  })

}(window.jQuery);/* ========================================================
 * bootstrap-tab.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#tabs
 * ========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================== */


!function ($) {

  "use strict"; // jshint ;_;


 /* TAB CLASS DEFINITION
  * ==================== */

  var Tab = function ( element ) {
    this.element = $(element)
  }

  Tab.prototype = {

    constructor: Tab

  , show: function () {
      var $this = this.element
        , $ul = $this.closest('ul:not(.dropdown-menu)')
        , selector = $this.attr('data-target')
        , previous
        , $target
        , e

      if (!selector) {
        selector = $this.attr('href')
        selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
      }

      if ( $this.parent('li').hasClass('active') ) return

      previous = $ul.find('.active a').last()[0]

      e = $.Event('show', {
        relatedTarget: previous
      })

      $this.trigger(e)

      if (e.isDefaultPrevented()) return

      $target = $(selector)

      this.activate($this.parent('li'), $ul)
      this.activate($target, $target.parent(), function () {
        $this.trigger({
          type: 'shown'
        , relatedTarget: previous
        })
      })
    }

  , activate: function ( element, container, callback) {
      var $active = container.find('> .active')
        , transition = callback
            && $.support.transition
            && $active.hasClass('fade')

      function next() {
        $active
          .removeClass('active')
          .find('> .dropdown-menu > .active')
          .removeClass('active')

        element.addClass('active')

        if (transition) {
          element[0].offsetWidth // reflow for transition
          element.addClass('in')
        } else {
          element.removeClass('fade')
        }

        if ( element.parent('.dropdown-menu') ) {
          element.closest('li.dropdown').addClass('active')
        }

        callback && callback()
      }

      transition ?
        $active.one($.support.transition.end, next) :
        next()

      $active.removeClass('in')
    }
  }


 /* TAB PLUGIN DEFINITION
  * ===================== */

  $.fn.tab = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('tab')
      if (!data) $this.data('tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.tab.Constructor = Tab


 /* TAB DATA-API
  * ============ */

  $(function () {
    $('body').on('click.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
      e.preventDefault()
      $(this).tab('show')
    })
  })

}(window.jQuery);/* =============================================================
 * bootstrap-typeahead.js v2.0.3
 * http://twitter.github.com/bootstrap/javascript.html#typeahead
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function($){

  "use strict"; // jshint ;_;


 /* TYPEAHEAD PUBLIC CLASS DEFINITION
  * ================================= */

  var Typeahead = function (element, options) {
    this.$element = $(element)
    this.options = $.extend({}, $.fn.typeahead.defaults, options)
    this.matcher = this.options.matcher || this.matcher
    this.sorter = this.options.sorter || this.sorter
    this.highlighter = this.options.highlighter || this.highlighter
    this.updater = this.options.updater || this.updater
    this.$menu = $(this.options.menu).appendTo('body')
    this.source = this.options.source
    this.shown = false
    this.listen()
  }

  Typeahead.prototype = {

    constructor: Typeahead

  , select: function () {
      var val = this.$menu.find('.active').attr('data-value')
      this.$element
        .val(this.updater(val))
        .change()
      return this.hide()
    }

  , updater: function (item) {
      return item
    }

  , show: function () {
      var pos = $.extend({}, this.$element.offset(), {
        height: this.$element[0].offsetHeight
      })

      this.$menu.css({
        top: pos.top + pos.height
      , left: pos.left
      })

      this.$menu.show()
      this.shown = true
      return this
    }

  , hide: function () {
      this.$menu.hide()
      this.shown = false
      return this
    }

  , lookup: function (event) {
      var that = this
        , items
        , q

      this.query = this.$element.val()

      if (!this.query) {
        return this.shown ? this.hide() : this
      }

      items = $.grep(this.source, function (item) {
        return that.matcher(item)
      })

      items = this.sorter(items)

      if (!items.length) {
        return this.shown ? this.hide() : this
      }

      return this.render(items.slice(0, this.options.items)).show()
    }

  , matcher: function (item) {
      return ~item.toLowerCase().indexOf(this.query.toLowerCase())
    }

  , sorter: function (items) {
      var beginswith = []
        , caseSensitive = []
        , caseInsensitive = []
        , item

      while (item = items.shift()) {
        if (!item.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item)
        else if (~item.indexOf(this.query)) caseSensitive.push(item)
        else caseInsensitive.push(item)
      }

      return beginswith.concat(caseSensitive, caseInsensitive)
    }

  , highlighter: function (item) {
      var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&')
      return item.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
        return '<strong>' + match + '</strong>'
      })
    }

  , render: function (items) {
      var that = this

      items = $(items).map(function (i, item) {
        i = $(that.options.item).attr('data-value', item)
        i.find('a').html(that.highlighter(item))
        return i[0]
      })

      items.first().addClass('active')
      this.$menu.html(items)
      return this
    }

  , next: function (event) {
      var active = this.$menu.find('.active').removeClass('active')
        , next = active.next()

      if (!next.length) {
        next = $(this.$menu.find('li')[0])
      }

      next.addClass('active')
    }

  , prev: function (event) {
      var active = this.$menu.find('.active').removeClass('active')
        , prev = active.prev()

      if (!prev.length) {
        prev = this.$menu.find('li').last()
      }

      prev.addClass('active')
    }

  , listen: function () {
      this.$element
        .on('blur',     $.proxy(this.blur, this))
        .on('keypress', $.proxy(this.keypress, this))
        .on('keyup',    $.proxy(this.keyup, this))

      if ($.browser.webkit || $.browser.msie) {
        this.$element.on('keydown', $.proxy(this.keypress, this))
      }

      this.$menu
        .on('click', $.proxy(this.click, this))
        .on('mouseenter', 'li', $.proxy(this.mouseenter, this))
    }

  , keyup: function (e) {
      switch(e.keyCode) {
        case 40: // down arrow
        case 38: // up arrow
          break

        case 9: // tab
        case 13: // enter
          if (!this.shown) return
          this.select()
          break

        case 27: // escape
          if (!this.shown) return
          this.hide()
          break

        default:
          this.lookup()
      }

      e.stopPropagation()
      e.preventDefault()
  }

  , keypress: function (e) {
      if (!this.shown) return

      switch(e.keyCode) {
        case 9: // tab
        case 13: // enter
        case 27: // escape
          e.preventDefault()
          break

        case 38: // up arrow
          if (e.type != 'keydown') break
          e.preventDefault()
          this.prev()
          break

        case 40: // down arrow
          if (e.type != 'keydown') break
          e.preventDefault()
          this.next()
          break
      }

      e.stopPropagation()
    }

  , blur: function (e) {
      var that = this
      setTimeout(function () { that.hide() }, 150)
    }

  , click: function (e) {
      e.stopPropagation()
      e.preventDefault()
      this.select()
    }

  , mouseenter: function (e) {
      this.$menu.find('.active').removeClass('active')
      $(e.currentTarget).addClass('active')
    }

  }


  /* TYPEAHEAD PLUGIN DEFINITION
   * =========================== */

  $.fn.typeahead = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('typeahead')
        , options = typeof option == 'object' && option
      if (!data) $this.data('typeahead', (data = new Typeahead(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.typeahead.defaults = {
    source: []
  , items: 8
  , menu: '<ul class="typeahead dropdown-menu"></ul>'
  , item: '<li><a href="#"></a></li>'
  }

  $.fn.typeahead.Constructor = Typeahead


 /* TYPEAHEAD DATA-API
  * ================== */

  $(function () {
    $('body').on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
      var $this = $(this)
      if ($this.data('typeahead')) return
      e.preventDefault()
      $this.typeahead($this.data())
    })
  })

}(window.jQuery);
var a,COMPILED=true,goog=goog||{};goog.global=this;goog.DEBUG=true;goog.LOCALE="en";goog.evalWorksForGlobals_=null;goog.provide=function(b){if(!COMPILED){if(goog.getObjectByName(b)&&!goog.implicitNamespaces_[b])throw Error('Namespace "'+b+'" already declared.');for(var c=b;c=c.substring(0,c.lastIndexOf("."));)goog.implicitNamespaces_[c]=true}goog.exportPath_(b)};if(!COMPILED)goog.implicitNamespaces_={};
goog.exportPath_=function(b,c,d){b=b.split(".");d=d||goog.global;!(b[0]in d)&&d.execScript&&d.execScript("var "+b[0]);for(var e;b.length&&(e=b.shift());)if(!b.length&&goog.isDef(c))d[e]=c;else d=d[e]?d[e]:(d[e]={})};goog.getObjectByName=function(b,c){b=b.split(".");c=c||goog.global;for(var d;d=b.shift();)if(c[d])c=c[d];else return null;return c};goog.globalize=function(b,c){c=c||goog.global;for(var d in b)c[d]=b[d]};
goog.addDependency=function(b,c,d){if(!COMPILED){var e;b=b.replace(/\\/g,"/");for(var f=goog.dependencies_,g=0;e=c[g];g++){f.nameToPath[e]=b;b in f.pathToNames||(f.pathToNames[b]={});f.pathToNames[b][e]=true}for(e=0;c=d[e];e++){b in f.requires||(f.requires[b]={});f.requires[b][c]=true}}};
goog.require=function(b){if(!COMPILED)if(!goog.getObjectByName(b)){var c=goog.getPathFromDeps_(b);if(c){goog.included_[c]=true;goog.writeScripts_()}else{b="goog.require could not find: "+b;goog.global.console&&goog.global.console.error(b);throw Error(b);}}};goog.basePath="";goog.nullFunction=function(){};goog.identityFunction=function(b){return b};goog.abstractMethod=function(){throw Error("unimplemented abstract method");};
goog.addSingletonGetter=function(b){b.getInstance=function(){return b.instance_||(b.instance_=new b)}};
if(!COMPILED){goog.included_={};goog.dependencies_={pathToNames:{},nameToPath:{},requires:{},visited:{},written:{}};goog.inHtmlDocument_=function(){var b=goog.global.document;return typeof b!="undefined"&&"write"in b};goog.findBasePath_=function(){if(goog.inHtmlDocument_()){var b=goog.global.document;if(goog.global.CLOSURE_BASE_PATH)goog.basePath=goog.global.CLOSURE_BASE_PATH;else{b=b.getElementsByTagName("script");for(var c=b.length-1;c>=0;--c){var d=b[c].src,e=d.length;if(d.substr(e-7)=="base.js"){goog.basePath=
d.substr(0,e-7);return}}}}};goog.writeScriptTag_=function(b){if(goog.inHtmlDocument_()&&!goog.dependencies_.written[b]){goog.dependencies_.written[b]=true;var c=goog.global.document;c.write('<script type="text/javascript" src="'+b+'"><\/script>')}};goog.writeScripts_=function(){function b(g){if(!(g in e.written)){if(!(g in e.visited)){e.visited[g]=true;if(g in e.requires)for(var h in e.requires[g])if(h in e.nameToPath)b(e.nameToPath[h]);else if(!goog.getObjectByName(h))throw Error("Undefined nameToPath for "+
h);}if(!(g in d)){d[g]=true;c.push(g)}}}var c=[],d={},e=goog.dependencies_;for(var f in goog.included_)e.written[f]||b(f);for(f=0;f<c.length;f++)if(c[f])goog.writeScriptTag_(goog.basePath+c[f]);else throw Error("Undefined script input");};goog.getPathFromDeps_=function(b){return b in goog.dependencies_.nameToPath?goog.dependencies_.nameToPath[b]:null};goog.findBasePath_();goog.global.CLOSURE_NO_DEPS||goog.writeScriptTag_(goog.basePath+"deps.js")}
goog.typeOf=function(b){var c=typeof b;if(c=="object")if(b){if(b instanceof Array||!(b instanceof Object)&&Object.prototype.toString.call(b)=="[object Array]"||typeof b.length=="number"&&typeof b.splice!="undefined"&&typeof b.propertyIsEnumerable!="undefined"&&!b.propertyIsEnumerable("splice"))return"array";if(!(b instanceof Object)&&(Object.prototype.toString.call(b)=="[object Function]"||typeof b.call!="undefined"&&typeof b.propertyIsEnumerable!="undefined"&&!b.propertyIsEnumerable("call")))return"function"}else return"null";
else if(c=="function"&&typeof b.call=="undefined")return"object";return c};goog.propertyIsEnumerableCustom_=function(b,c){if(c in b)for(var d in b)if(d==c&&Object.prototype.hasOwnProperty.call(b,c))return true;return false};goog.propertyIsEnumerable_=function(b,c){return b instanceof Object?Object.prototype.propertyIsEnumerable.call(b,c):goog.propertyIsEnumerableCustom_(b,c)};goog.isDef=function(b){return b!==undefined};goog.isNull=function(b){return b===null};
goog.isDefAndNotNull=function(b){return b!=null};goog.isArray=function(b){return goog.typeOf(b)=="array"};goog.isArrayLike=function(b){var c=goog.typeOf(b);return c=="array"||c=="object"&&typeof b.length=="number"};goog.isDateLike=function(b){return goog.isObject(b)&&typeof b.getFullYear=="function"};goog.isString=function(b){return typeof b=="string"};goog.isBoolean=function(b){return typeof b=="boolean"};goog.isNumber=function(b){return typeof b=="number"};
goog.isFunction=function(b){return goog.typeOf(b)=="function"};goog.isObject=function(b){b=goog.typeOf(b);return b=="object"||b=="array"||b=="function"};goog.getUid=function(b){return b[goog.UID_PROPERTY_]||(b[goog.UID_PROPERTY_]=++goog.uidCounter_)};goog.removeUid=function(b){"removeAttribute"in b&&b.removeAttribute(goog.UID_PROPERTY_);try{delete b[goog.UID_PROPERTY_]}catch(c){}};goog.UID_PROPERTY_="closure_uid_"+Math.floor(Math.random()*2147483648).toString(36);goog.uidCounter_=0;
goog.getHashCode=goog.getUid;goog.removeHashCode=goog.removeUid;goog.cloneObject=function(b){var c=goog.typeOf(b);if(c=="object"||c=="array"){if(b.clone)return b.clone();c=c=="array"?[]:{};for(var d in b)c[d]=goog.cloneObject(b[d]);return c}return b};
goog.bind=function(b,c){var d=c||goog.global;if(arguments.length>2){var e=Array.prototype.slice.call(arguments,2);return function(){var f=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(f,e);return b.apply(d,f)}}else return function(){return b.apply(d,arguments)}};goog.partial=function(b){var c=Array.prototype.slice.call(arguments,1);return function(){var d=Array.prototype.slice.call(arguments);d.unshift.apply(d,c);return b.apply(this,d)}};
goog.mixin=function(b,c){for(var d in c)b[d]=c[d]};goog.now=Date.now||function(){return+new Date};
goog.globalEval=function(b){if(goog.global.execScript)goog.global.execScript(b,"JavaScript");else if(goog.global.eval){if(goog.evalWorksForGlobals_==null){goog.global.eval("var _et_ = 1;");if(typeof goog.global._et_!="undefined"){delete goog.global._et_;goog.evalWorksForGlobals_=true}else goog.evalWorksForGlobals_=false}if(goog.evalWorksForGlobals_)goog.global.eval(b);else{var c=goog.global.document,d=c.createElement("script");d.type="text/javascript";d.defer=false;d.appendChild(c.createTextNode(b));
c.body.appendChild(d);c.body.removeChild(d)}}else throw Error("goog.globalEval not available");};goog.typedef=true;goog.getCssName=function(b,c){b=b+(c?"-"+c:"");return goog.cssNameMapping_&&b in goog.cssNameMapping_?goog.cssNameMapping_[b]:b};goog.setCssNameMapping=function(b){goog.cssNameMapping_=b};goog.getMsg=function(b,c){c=c||{};for(var d in c){var e=(""+c[d]).replace(/\$/g,"$$$$");b=b.replace(new RegExp("\\{\\$"+d+"\\}","gi"),e)}return b};
goog.exportSymbol=function(b,c,d){goog.exportPath_(b,c,d)};goog.exportProperty=function(b,c,d){b[c]=d};goog.inherits=function(b,c){function d(){}d.prototype=c.prototype;b.superClass_=c.prototype;b.prototype=new d;b.prototype.constructor=b};
goog.base=function(b,c){var d=arguments.callee.caller;if(d.superClass_)return d.superClass_.constructor.apply(b,Array.prototype.slice.call(arguments,1));for(var e=Array.prototype.slice.call(arguments,2),f=false,g=b.constructor;g;g=g.superClass_&&g.superClass_.constructor)if(g.prototype[c]===d)f=true;else if(f)return g.prototype[c].apply(b,e);if(b[c]===d)return b.constructor.prototype[c].apply(b,e);else throw Error("goog.base called from a method of one name to a method of a different name");};
goog.scope=function(b){b.call(goog.global)};goog.debug={};goog.debug.Error=function(b){this.stack=(new Error).stack||"";if(b)this.message=String(b)};goog.inherits(goog.debug.Error,Error);goog.debug.Error.prototype.name="CustomError";goog.string={};goog.string.Unicode={NBSP:"\u00a0"};goog.string.startsWith=function(b,c){return b.lastIndexOf(c,0)==0};goog.string.endsWith=function(b,c){var d=b.length-c.length;return d>=0&&b.indexOf(c,d)==d};goog.string.caseInsensitiveStartsWith=function(b,c){return goog.string.caseInsensitiveCompare(c,b.substr(0,c.length))==0};goog.string.caseInsensitiveEndsWith=function(b,c){return goog.string.caseInsensitiveCompare(c,b.substr(b.length-c.length,c.length))==0};
goog.string.subs=function(b){for(var c=1;c<arguments.length;c++){var d=String(arguments[c]).replace(/\$/g,"$$$$");b=b.replace(/\%s/,d)}return b};goog.string.collapseWhitespace=function(b){return b.replace(/[\s\xa0]+/g," ").replace(/^\s+|\s+$/g,"")};goog.string.isEmpty=function(b){return/^[\s\xa0]*$/.test(b)};goog.string.isEmptySafe=function(b){return goog.string.isEmpty(goog.string.makeSafe(b))};goog.string.isBreakingWhitespace=function(b){return!/[^\t\n\r ]/.test(b)};goog.string.isAlpha=function(b){return!/[^a-zA-Z]/.test(b)};
goog.string.isNumeric=function(b){return!/[^0-9]/.test(b)};goog.string.isAlphaNumeric=function(b){return!/[^a-zA-Z0-9]/.test(b)};goog.string.isSpace=function(b){return b==" "};goog.string.isUnicodeChar=function(b){return b.length==1&&b>=" "&&b<="~"||b>="\u0080"&&b<="\ufffd"};goog.string.stripNewlines=function(b){return b.replace(/(\r\n|\r|\n)+/g," ")};goog.string.canonicalizeNewlines=function(b){return b.replace(/(\r\n|\r|\n)/g,"\n")};
goog.string.normalizeWhitespace=function(b){return b.replace(/\xa0|\s/g," ")};goog.string.normalizeSpaces=function(b){return b.replace(/\xa0|[ \t]+/g," ")};goog.string.trim=function(b){return b.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};goog.string.trimLeft=function(b){return b.replace(/^[\s\xa0]+/,"")};goog.string.trimRight=function(b){return b.replace(/[\s\xa0]+$/,"")};goog.string.caseInsensitiveCompare=function(b,c){b=String(b).toLowerCase();c=String(c).toLowerCase();return b<c?-1:b==c?0:1};
goog.string.numerateCompareRegExp_=/(\.\d+)|(\d+)|(\D+)/g;goog.string.numerateCompare=function(b,c){if(b==c)return 0;if(!b)return-1;if(!c)return 1;for(var d=b.toLowerCase().match(goog.string.numerateCompareRegExp_),e=c.toLowerCase().match(goog.string.numerateCompareRegExp_),f=Math.min(d.length,e.length),g=0;g<f;g++){var h=d[g],i=e[g];if(h!=i){b=parseInt(h,10);if(!isNaN(b)){c=parseInt(i,10);if(!isNaN(c)&&b-c)return b-c}return h<i?-1:1}}if(d.length!=e.length)return d.length-e.length;return b<c?-1:1};
goog.string.encodeUriRegExp_=/^[a-zA-Z0-9\-_.!~*'()]*$/;goog.string.urlEncode=function(b){b=String(b);if(!goog.string.encodeUriRegExp_.test(b))return encodeURIComponent(b);return b};goog.string.urlDecode=function(b){return decodeURIComponent(b.replace(/\+/g," "))};goog.string.newLineToBr=function(b,c){return b.replace(/(\r\n|\r|\n)/g,c?"<br />":"<br>")};
goog.string.htmlEscape=function(b,c){if(c)return b.replace(goog.string.amperRe_,"&amp;").replace(goog.string.ltRe_,"&lt;").replace(goog.string.gtRe_,"&gt;").replace(goog.string.quotRe_,"&quot;");else{if(!goog.string.allRe_.test(b))return b;if(b.indexOf("&")!=-1)b=b.replace(goog.string.amperRe_,"&amp;");if(b.indexOf("<")!=-1)b=b.replace(goog.string.ltRe_,"&lt;");if(b.indexOf(">")!=-1)b=b.replace(goog.string.gtRe_,"&gt;");if(b.indexOf('"')!=-1)b=b.replace(goog.string.quotRe_,"&quot;");return b}};
goog.string.amperRe_=/&/g;goog.string.ltRe_=/</g;goog.string.gtRe_=/>/g;goog.string.quotRe_=/\"/g;goog.string.allRe_=/[&<>\"]/;goog.string.unescapeEntities=function(b){if(goog.string.contains(b,"&"))return"document"in goog.global&&!goog.string.contains(b,"<")?goog.string.unescapeEntitiesUsingDom_(b):goog.string.unescapePureXmlEntities_(b);return b};
goog.string.unescapeEntitiesUsingDom_=function(b){var c=goog.global.document.createElement("a");c.innerHTML=b;c[goog.string.NORMALIZE_FN_]&&c[goog.string.NORMALIZE_FN_]();b=c.firstChild.nodeValue;c.innerHTML="";return b};goog.string.unescapePureXmlEntities_=function(b){return b.replace(/&([^;]+);/g,function(c,d){switch(d){case "amp":return"&";case "lt":return"<";case "gt":return">";case "quot":return'"';default:if(d.charAt(0)=="#"){d=Number("0"+d.substr(1));if(!isNaN(d))return String.fromCharCode(d)}return c}})};
goog.string.NORMALIZE_FN_="normalize";goog.string.whitespaceEscape=function(b,c){return goog.string.newLineToBr(b.replace(/  /g," &#160;"),c)};goog.string.stripQuotes=function(b,c){for(var d=c.length,e=0;e<d;e++){var f=d==1?c:c.charAt(e);if(b.charAt(0)==f&&b.charAt(b.length-1)==f)return b.substring(1,b.length-1)}return b};goog.string.truncate=function(b,c,d){if(d)b=goog.string.unescapeEntities(b);if(b.length>c)b=b.substring(0,c-3)+"...";if(d)b=goog.string.htmlEscape(b);return b};
goog.string.truncateMiddle=function(b,c,d){if(d)b=goog.string.unescapeEntities(b);if(b.length>c){var e=Math.floor(c/2),f=b.length-e;e+=c%2;b=b.substring(0,e)+"..."+b.substring(f)}if(d)b=goog.string.htmlEscape(b);return b};goog.string.specialEscapeChars_={"\u0000":"\\0","\u0008":"\\b","\u000c":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\u000b":"\\x0B",'"':'\\"',"\\":"\\\\"};goog.string.jsEscapeCache_={"'":"\\'"};
goog.string.quote=function(b){b=String(b);if(b.quote)return b.quote();else{for(var c=['"'],d=0;d<b.length;d++){var e=b.charAt(d),f=e.charCodeAt(0);c[d+1]=goog.string.specialEscapeChars_[e]||(f>31&&f<127?e:goog.string.escapeChar(e))}c.push('"');return c.join("")}};goog.string.escapeString=function(b){for(var c=[],d=0;d<b.length;d++)c[d]=goog.string.escapeChar(b.charAt(d));return c.join("")};
goog.string.escapeChar=function(b){if(b in goog.string.jsEscapeCache_)return goog.string.jsEscapeCache_[b];if(b in goog.string.specialEscapeChars_)return goog.string.jsEscapeCache_[b]=goog.string.specialEscapeChars_[b];var c=b,d=b.charCodeAt(0);if(d>31&&d<127)c=b;else{if(d<256){c="\\x";if(d<16||d>256)c+="0"}else{c="\\u";if(d<4096)c+="0"}c+=d.toString(16).toUpperCase()}return goog.string.jsEscapeCache_[b]=c};goog.string.toMap=function(b){for(var c={},d=0;d<b.length;d++)c[b.charAt(d)]=true;return c};
goog.string.contains=function(b,c){return b.indexOf(c)!=-1};goog.string.removeAt=function(b,c,d){var e=b;if(c>=0&&c<b.length&&d>0)e=b.substr(0,c)+b.substr(c+d,b.length-c-d);return e};goog.string.remove=function(b,c){c=new RegExp(goog.string.regExpEscape(c),"");return b.replace(c,"")};goog.string.removeAll=function(b,c){c=new RegExp(goog.string.regExpEscape(c),"g");return b.replace(c,"")};
goog.string.regExpEscape=function(b){return String(b).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")};goog.string.repeat=function(b,c){return(new Array(c+1)).join(b)};goog.string.padNumber=function(b,c,d){b=goog.isDef(d)?b.toFixed(d):String(b);d=b.indexOf(".");if(d==-1)d=b.length;return goog.string.repeat("0",Math.max(0,c-d))+b};goog.string.makeSafe=function(b){return b==null?"":String(b)};goog.string.buildString=function(){return Array.prototype.join.call(arguments,"")};
goog.string.getRandomString=function(){return Math.floor(Math.random()*2147483648).toString(36)+(Math.floor(Math.random()*2147483648)^goog.now()).toString(36)};
goog.string.compareVersions=function(b,c){var d=0;b=goog.string.trim(String(b)).split(".");c=goog.string.trim(String(c)).split(".");for(var e=Math.max(b.length,c.length),f=0;d==0&&f<e;f++){var g=b[f]||"",h=c[f]||"",i=new RegExp("(\\d*)(\\D*)","g"),j=new RegExp("(\\d*)(\\D*)","g");do{var k=i.exec(g)||["","",""],l=j.exec(h)||["","",""];if(k[0].length==0&&l[0].length==0)break;d=k[1].length==0?0:parseInt(k[1],10);var n=l[1].length==0?0:parseInt(l[1],10);d=goog.string.compareElements_(d,n)||goog.string.compareElements_(k[2].length==
0,l[2].length==0)||goog.string.compareElements_(k[2],l[2])}while(d==0)}return d};goog.string.compareElements_=function(b,c){if(b<c)return-1;else if(b>c)return 1;return 0};goog.string.HASHCODE_MAX_=4294967296;goog.string.hashCode=function(b){for(var c=0,d=0;d<b.length;++d){c=31*c+b.charCodeAt(d);c%=goog.string.HASHCODE_MAX_}return c};goog.string.uniqueStringCounter_=Math.random()*2147483648|0;goog.string.createUniqueString=function(){return"goog_"+goog.string.uniqueStringCounter_++};
goog.string.toNumber=function(b){var c=Number(b);if(c==0&&goog.string.isEmpty(b))return NaN;return c};goog.asserts={};goog.asserts.ENABLE_ASSERTS=goog.DEBUG;goog.asserts.AssertionError=function(b,c){c.unshift(b);goog.debug.Error.call(this,goog.string.subs.apply(null,c));c.shift();this.messagePattern=b};goog.inherits(goog.asserts.AssertionError,goog.debug.Error);goog.asserts.AssertionError.prototype.name="AssertionError";goog.asserts.doAssertFailure_=function(b,c,d,e){var f="Assertion failed";if(d){f+=": "+d;var g=e}else if(b){f+=": "+b;g=c}throw new goog.asserts.AssertionError(""+f,g||[]);};
goog.asserts.assert=function(b,c){goog.asserts.ENABLE_ASSERTS&&!b&&goog.asserts.doAssertFailure_("",null,c,Array.prototype.slice.call(arguments,2))};goog.asserts.fail=function(b){if(goog.asserts.ENABLE_ASSERTS)throw new goog.asserts.AssertionError("Failure"+(b?": "+b:""),Array.prototype.slice.call(arguments,1));};
goog.asserts.assertNumber=function(b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isNumber(b)&&goog.asserts.doAssertFailure_("Expected number but got %s.",[b],c,Array.prototype.slice.call(arguments,2));return b};goog.asserts.assertString=function(b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isString(b)&&goog.asserts.doAssertFailure_("Expected string but got %s.",[b],c,Array.prototype.slice.call(arguments,2));return b};
goog.asserts.assertFunction=function(b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isFunction(b)&&goog.asserts.doAssertFailure_("Expected function but got %s.",[b],c,Array.prototype.slice.call(arguments,2));return b};goog.asserts.assertObject=function(b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isObject(b)&&goog.asserts.doAssertFailure_("Expected object but got %s.",[b],c,Array.prototype.slice.call(arguments,2));return b};
goog.asserts.assertArray=function(b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isArray(b)&&goog.asserts.doAssertFailure_("Expected array but got %s.",[b],c,Array.prototype.slice.call(arguments,2));return b};goog.asserts.assertBoolean=function(b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isBoolean(b)&&goog.asserts.doAssertFailure_("Expected boolean but got %s.",[b],c,Array.prototype.slice.call(arguments,2));return b};
goog.asserts.assertInstanceof=function(b,c,d){goog.asserts.ENABLE_ASSERTS&&!(b instanceof c)&&goog.asserts.doAssertFailure_("instanceof check failed.",null,d,Array.prototype.slice.call(arguments,3))};goog.array={};goog.array.peek=function(b){return b[b.length-1]};goog.array.ARRAY_PROTOTYPE_=Array.prototype;goog.array.indexOf=goog.array.ARRAY_PROTOTYPE_.indexOf?function(b,c,d){goog.asserts.assert(b.length!=null);return goog.array.ARRAY_PROTOTYPE_.indexOf.call(b,c,d)}:function(b,c,d){d=d==null?0:d<0?Math.max(0,b.length+d):d;if(goog.isString(b)){if(!goog.isString(c)||c.length!=1)return-1;return b.indexOf(c,d)}for(d=d;d<b.length;d++)if(d in b&&b[d]===c)return d;return-1};
goog.array.lastIndexOf=goog.array.ARRAY_PROTOTYPE_.lastIndexOf?function(b,c,d){goog.asserts.assert(b.length!=null);d=d==null?b.length-1:d;return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(b,c,d)}:function(b,c,d){d=d==null?b.length-1:d;if(d<0)d=Math.max(0,b.length+d);if(goog.isString(b)){if(!goog.isString(c)||c.length!=1)return-1;return b.lastIndexOf(c,d)}for(d=d;d>=0;d--)if(d in b&&b[d]===c)return d;return-1};
goog.array.forEach=goog.array.ARRAY_PROTOTYPE_.forEach?function(b,c,d){goog.asserts.assert(b.length!=null);goog.array.ARRAY_PROTOTYPE_.forEach.call(b,c,d)}:function(b,c,d){for(var e=b.length,f=goog.isString(b)?b.split(""):b,g=0;g<e;g++)g in f&&c.call(d,f[g],g,b)};goog.array.forEachRight=function(b,c,d){var e=b.length,f=goog.isString(b)?b.split(""):b;for(e=e-1;e>=0;--e)e in f&&c.call(d,f[e],e,b)};
goog.array.filter=goog.array.ARRAY_PROTOTYPE_.filter?function(b,c,d){goog.asserts.assert(b.length!=null);return goog.array.ARRAY_PROTOTYPE_.filter.call(b,c,d)}:function(b,c,d){for(var e=b.length,f=[],g=0,h=goog.isString(b)?b.split(""):b,i=0;i<e;i++)if(i in h){var j=h[i];if(c.call(d,j,i,b))f[g++]=j}return f};
goog.array.map=goog.array.ARRAY_PROTOTYPE_.map?function(b,c,d){goog.asserts.assert(b.length!=null);return goog.array.ARRAY_PROTOTYPE_.map.call(b,c,d)}:function(b,c,d){for(var e=b.length,f=new Array(e),g=goog.isString(b)?b.split(""):b,h=0;h<e;h++)if(h in g)f[h]=c.call(d,g[h],h,b);return f};goog.array.reduce=function(b,c,d,e){if(b.reduce)return e?b.reduce(goog.bind(c,e),d):b.reduce(c,d);var f=d;goog.array.forEach(b,function(g,h){f=c.call(e,f,g,h,b)});return f};
goog.array.reduceRight=function(b,c,d,e){if(b.reduceRight)return e?b.reduceRight(goog.bind(c,e),d):b.reduceRight(c,d);var f=d;goog.array.forEachRight(b,function(g,h){f=c.call(e,f,g,h,b)});return f};goog.array.some=goog.array.ARRAY_PROTOTYPE_.some?function(b,c,d){goog.asserts.assert(b.length!=null);return goog.array.ARRAY_PROTOTYPE_.some.call(b,c,d)}:function(b,c,d){for(var e=b.length,f=goog.isString(b)?b.split(""):b,g=0;g<e;g++)if(g in f&&c.call(d,f[g],g,b))return true;return false};
goog.array.every=goog.array.ARRAY_PROTOTYPE_.every?function(b,c,d){goog.asserts.assert(b.length!=null);return goog.array.ARRAY_PROTOTYPE_.every.call(b,c,d)}:function(b,c,d){for(var e=b.length,f=goog.isString(b)?b.split(""):b,g=0;g<e;g++)if(g in f&&!c.call(d,f[g],g,b))return false;return true};goog.array.find=function(b,c,d){c=goog.array.findIndex(b,c,d);return c<0?null:goog.isString(b)?b.charAt(c):b[c]};
goog.array.findIndex=function(b,c,d){for(var e=b.length,f=goog.isString(b)?b.split(""):b,g=0;g<e;g++)if(g in f&&c.call(d,f[g],g,b))return g;return-1};goog.array.findRight=function(b,c,d){c=goog.array.findIndexRight(b,c,d);return c<0?null:goog.isString(b)?b.charAt(c):b[c]};goog.array.findIndexRight=function(b,c,d){var e=b.length,f=goog.isString(b)?b.split(""):b;for(e=e-1;e>=0;e--)if(e in f&&c.call(d,f[e],e,b))return e;return-1};goog.array.contains=function(b,c){return goog.array.indexOf(b,c)>=0};
goog.array.isEmpty=function(b){return b.length==0};goog.array.clear=function(b){if(!goog.isArray(b))for(var c=b.length-1;c>=0;c--)delete b[c];b.length=0};goog.array.insert=function(b,c){goog.array.contains(b,c)||b.push(c)};goog.array.insertAt=function(b,c,d){goog.array.splice(b,d,0,c)};goog.array.insertArrayAt=function(b,c,d){goog.partial(goog.array.splice,b,d,0).apply(null,c)};
goog.array.insertBefore=function(b,c,d){var e;arguments.length==2||(e=goog.array.indexOf(b,d))<0?b.push(c):goog.array.insertAt(b,c,e)};goog.array.remove=function(b,c){c=goog.array.indexOf(b,c);var d;if(d=c>=0)goog.array.removeAt(b,c);return d};goog.array.removeAt=function(b,c){goog.asserts.assert(b.length!=null);return goog.array.ARRAY_PROTOTYPE_.splice.call(b,c,1).length==1};goog.array.removeIf=function(b,c,d){c=goog.array.findIndex(b,c,d);if(c>=0){goog.array.removeAt(b,c);return true}return false};
goog.array.concat=function(){return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_,arguments)};goog.array.clone=function(b){if(goog.isArray(b))return goog.array.concat(b);else{for(var c=[],d=0,e=b.length;d<e;d++)c[d]=b[d];return c}};goog.array.toArray=function(b){if(goog.isArray(b))return goog.array.concat(b);return goog.array.clone(b)};
goog.array.extend=function(b){for(var c=1;c<arguments.length;c++){var d=arguments[c],e;if(goog.isArray(d)||(e=goog.isArrayLike(d))&&d.hasOwnProperty("callee"))b.push.apply(b,d);else if(e)for(var f=b.length,g=d.length,h=0;h<g;h++)b[f+h]=d[h];else b.push(d)}};goog.array.splice=function(b){goog.asserts.assert(b.length!=null);return goog.array.ARRAY_PROTOTYPE_.splice.apply(b,goog.array.slice(arguments,1))};
goog.array.slice=function(b,c,d){goog.asserts.assert(b.length!=null);return arguments.length<=2?goog.array.ARRAY_PROTOTYPE_.slice.call(b,c):goog.array.ARRAY_PROTOTYPE_.slice.call(b,c,d)};goog.array.removeDuplicates=function(b,c){c=c||b;for(var d={},e=0,f=0;f<b.length;){var g=b[f++],h=goog.isObject(g)?goog.getUid(g):g;if(!Object.prototype.hasOwnProperty.call(d,h)){d[h]=true;c[e++]=g}}c.length=e};
goog.array.binarySearch=function(b,c,d){return goog.array.binarySearch_(b,d||goog.array.defaultCompare,false,c)};goog.array.binarySelect=function(b,c,d){return goog.array.binarySearch_(b,c,true,undefined,d)};goog.array.binarySearch_=function(b,c,d,e,f){for(var g=0,h=b.length,i;g<h;){var j=g+h>>1,k;k=d?c.call(f,b[j],j,b):c(e,b[j]);if(k>0)g=j+1;else{h=j;i=!k}}return i?g:~g};goog.array.sort=function(b,c){goog.asserts.assert(b.length!=null);goog.array.ARRAY_PROTOTYPE_.sort.call(b,c||goog.array.defaultCompare)};
goog.array.stableSort=function(b,c){function d(g,h){return f(g.value,h.value)||g.index-h.index}for(var e=0;e<b.length;e++)b[e]={index:e,value:b[e]};var f=c||goog.array.defaultCompare;goog.array.sort(b,d);for(e=0;e<b.length;e++)b[e]=b[e].value};goog.array.sortObjectsByKey=function(b,c,d){var e=d||goog.array.defaultCompare;goog.array.sort(b,function(f,g){return e(f[c],g[c])})};
goog.array.equals=function(b,c,d){if(!goog.isArrayLike(b)||!goog.isArrayLike(c)||b.length!=c.length)return false;var e=b.length;d=d||goog.array.defaultCompareEquality;for(var f=0;f<e;f++)if(!d(b[f],c[f]))return false;return true};goog.array.compare=function(b,c,d){return goog.array.equals(b,c,d)};goog.array.defaultCompare=function(b,c){return b>c?1:b<c?-1:0};goog.array.defaultCompareEquality=function(b,c){return b===c};
goog.array.binaryInsert=function(b,c,d){d=goog.array.binarySearch(b,c,d);if(d<0){goog.array.insertAt(b,c,-(d+1));return true}return false};goog.array.binaryRemove=function(b,c,d){c=goog.array.binarySearch(b,c,d);return c>=0?goog.array.removeAt(b,c):false};goog.array.bucket=function(b,c){for(var d={},e=0;e<b.length;e++){var f=b[e],g=c(f,e,b);if(goog.isDef(g)){g=d[g]||(d[g]=[]);g.push(f)}}return d};goog.array.repeat=function(b,c){for(var d=[],e=0;e<c;e++)d[e]=b;return d};
goog.array.flatten=function(){for(var b=[],c=0;c<arguments.length;c++){var d=arguments[c];goog.isArray(d)?b.push.apply(b,goog.array.flatten.apply(null,d)):b.push(d)}return b};goog.array.rotate=function(b,c){goog.asserts.assert(b.length!=null);if(b.length){c%=b.length;if(c>0)goog.array.ARRAY_PROTOTYPE_.unshift.apply(b,b.splice(-c,c));else c<0&&goog.array.ARRAY_PROTOTYPE_.push.apply(b,b.splice(0,-c))}return b};
goog.array.zip=function(){if(!arguments.length)return[];for(var b=[],c=0;1;c++){for(var d=[],e=0;e<arguments.length;e++){var f=arguments[e];if(c>=f.length)return b;d.push(f[c])}b.push(d)}};goog.dom={};
goog.dom.TagName={A:"A",ABBR:"ABBR",ACRONYM:"ACRONYM",ADDRESS:"ADDRESS",APPLET:"APPLET",AREA:"AREA",B:"B",BASE:"BASE",BASEFONT:"BASEFONT",BDO:"BDO",BIG:"BIG",BLOCKQUOTE:"BLOCKQUOTE",BODY:"BODY",BR:"BR",BUTTON:"BUTTON",CAPTION:"CAPTION",CENTER:"CENTER",CITE:"CITE",CODE:"CODE",COL:"COL",COLGROUP:"COLGROUP",DD:"DD",DEL:"DEL",DFN:"DFN",DIR:"DIR",DIV:"DIV",DL:"DL",DT:"DT",EM:"EM",FIELDSET:"FIELDSET",FONT:"FONT",FORM:"FORM",FRAME:"FRAME",FRAMESET:"FRAMESET",H1:"H1",H2:"H2",H3:"H3",H4:"H4",H5:"H5",H6:"H6",
HEAD:"HEAD",HR:"HR",HTML:"HTML",I:"I",IFRAME:"IFRAME",IMG:"IMG",INPUT:"INPUT",INS:"INS",ISINDEX:"ISINDEX",KBD:"KBD",LABEL:"LABEL",LEGEND:"LEGEND",LI:"LI",LINK:"LINK",MAP:"MAP",MENU:"MENU",META:"META",NOFRAMES:"NOFRAMES",NOSCRIPT:"NOSCRIPT",OBJECT:"OBJECT",OL:"OL",OPTGROUP:"OPTGROUP",OPTION:"OPTION",P:"P",PARAM:"PARAM",PRE:"PRE",Q:"Q",S:"S",SAMP:"SAMP",SCRIPT:"SCRIPT",SELECT:"SELECT",SMALL:"SMALL",SPAN:"SPAN",STRIKE:"STRIKE",STRONG:"STRONG",STYLE:"STYLE",SUB:"SUB",SUP:"SUP",TABLE:"TABLE",TBODY:"TBODY",
TD:"TD",TEXTAREA:"TEXTAREA",TFOOT:"TFOOT",TH:"TH",THEAD:"THEAD",TITLE:"TITLE",TR:"TR",TT:"TT",U:"U",UL:"UL",VAR:"VAR"};goog.dom.classes={};goog.dom.classes.set=function(b,c){b.className=c};goog.dom.classes.get=function(b){return(b=b.className)&&typeof b.split=="function"?b.split(/\s+/):[]};goog.dom.classes.add=function(b){var c=goog.dom.classes.get(b),d=goog.array.slice(arguments,1);d=goog.dom.classes.add_(c,d);b.className=c.join(" ");return d};goog.dom.classes.remove=function(b){var c=goog.dom.classes.get(b),d=goog.array.slice(arguments,1);d=goog.dom.classes.remove_(c,d);b.className=c.join(" ");return d};
goog.dom.classes.add_=function(b,c){for(var d=0,e=0;e<c.length;e++)if(!goog.array.contains(b,c[e])){b.push(c[e]);d++}return d==c.length};goog.dom.classes.remove_=function(b,c){for(var d=0,e=0;e<b.length;e++)if(goog.array.contains(c,b[e])){goog.array.splice(b,e--,1);d++}return d==c.length};goog.dom.classes.swap=function(b,c,d){for(var e=goog.dom.classes.get(b),f=false,g=0;g<e.length;g++)if(e[g]==c){goog.array.splice(e,g--,1);f=true}if(f){e.push(d);b.className=e.join(" ")}return f};
goog.dom.classes.addRemove=function(b,c,d){var e=goog.dom.classes.get(b);if(goog.isString(c))goog.array.remove(e,c);else goog.isArray(c)&&goog.dom.classes.remove_(e,c);if(goog.isString(d)&&!goog.array.contains(e,d))e.push(d);else goog.isArray(d)&&goog.dom.classes.add_(e,d);b.className=e.join(" ")};goog.dom.classes.has=function(b,c){return goog.array.contains(goog.dom.classes.get(b),c)};goog.dom.classes.enable=function(b,c,d){d?goog.dom.classes.add(b,c):goog.dom.classes.remove(b,c)};
goog.dom.classes.toggle=function(b,c){var d=!goog.dom.classes.has(b,c);goog.dom.classes.enable(b,c,d);return d};goog.math={};goog.math.Coordinate=function(b,c){this.x=goog.isDef(b)?b:0;this.y=goog.isDef(c)?c:0};goog.math.Coordinate.prototype.clone=function(){return new goog.math.Coordinate(this.x,this.y)};if(goog.DEBUG)goog.math.Coordinate.prototype.toString=function(){return"("+this.x+", "+this.y+")"};goog.math.Coordinate.equals=function(b,c){if(b==c)return true;if(!b||!c)return false;return b.x==c.x&&b.y==c.y};goog.math.Coordinate.distance=function(b,c){var d=b.x-c.x;b=b.y-c.y;return Math.sqrt(d*d+b*b)};
goog.math.Coordinate.squaredDistance=function(b,c){var d=b.x-c.x;b=b.y-c.y;return d*d+b*b};goog.math.Coordinate.difference=function(b,c){return new goog.math.Coordinate(b.x-c.x,b.y-c.y)};goog.math.Coordinate.sum=function(b,c){return new goog.math.Coordinate(b.x+c.x,b.y+c.y)};goog.math.Size=function(b,c){this.width=b;this.height=c};goog.math.Size.equals=function(b,c){if(b==c)return true;if(!b||!c)return false;return b.width==c.width&&b.height==c.height};goog.math.Size.prototype.clone=function(){return new goog.math.Size(this.width,this.height)};if(goog.DEBUG)goog.math.Size.prototype.toString=function(){return"("+this.width+" x "+this.height+")"};a=goog.math.Size.prototype;a.getLongest=function(){return Math.max(this.width,this.height)};
a.getShortest=function(){return Math.min(this.width,this.height)};a.area=function(){return this.width*this.height};a.aspectRatio=function(){return this.width/this.height};a.isEmpty=function(){return!this.area()};a.ceil=function(){this.width=Math.ceil(this.width);this.height=Math.ceil(this.height);return this};a.fitsInside=function(b){return this.width<=b.width&&this.height<=b.height};a.floor=function(){this.width=Math.floor(this.width);this.height=Math.floor(this.height);return this};
a.round=function(){this.width=Math.round(this.width);this.height=Math.round(this.height);return this};a.scale=function(b){this.width*=b;this.height*=b;return this};a.scaleToFit=function(b){b=this.aspectRatio()>b.aspectRatio()?b.width/this.width:b.height/this.height;return this.scale(b)};goog.object={};goog.object.forEach=function(b,c,d){for(var e in b)c.call(d,b[e],e,b)};goog.object.filter=function(b,c,d){var e={};for(var f in b)if(c.call(d,b[f],f,b))e[f]=b[f];return e};goog.object.map=function(b,c,d){var e={};for(var f in b)e[f]=c.call(d,b[f],f,b);return e};goog.object.some=function(b,c,d){for(var e in b)if(c.call(d,b[e],e,b))return true;return false};goog.object.every=function(b,c,d){for(var e in b)if(!c.call(d,b[e],e,b))return false;return true};
goog.object.getCount=function(b){var c=0;for(var d in b)c++;return c};goog.object.getAnyKey=function(b){for(var c in b)return c};goog.object.getAnyValue=function(b){for(var c in b)return b[c]};goog.object.contains=function(b,c){return goog.object.containsValue(b,c)};goog.object.getValues=function(b){var c=[],d=0;for(var e in b)c[d++]=b[e];return c};goog.object.getKeys=function(b){var c=[],d=0;for(var e in b)c[d++]=e;return c};goog.object.containsKey=function(b,c){return c in b};
goog.object.containsValue=function(b,c){for(var d in b)if(b[d]==c)return true;return false};goog.object.findKey=function(b,c,d){for(var e in b)if(c.call(d,b[e],e,b))return e};goog.object.findValue=function(b,c,d){return(c=goog.object.findKey(b,c,d))&&b[c]};goog.object.isEmpty=function(b){for(var c in b)return false;return true};goog.object.clear=function(b){for(var c=goog.object.getKeys(b),d=c.length-1;d>=0;d--)goog.object.remove(b,c[d])};
goog.object.remove=function(b,c){var d;if(d=c in b)delete b[c];return d};goog.object.add=function(b,c,d){if(c in b)throw Error('The object already contains the key "'+c+'"');goog.object.set(b,c,d)};goog.object.get=function(b,c,d){if(c in b)return b[c];return d};goog.object.set=function(b,c,d){b[c]=d};goog.object.setIfUndefined=function(b,c,d){return c in b?b[c]:(b[c]=d)};goog.object.clone=function(b){var c={};for(var d in b)c[d]=b[d];return c};
goog.object.transpose=function(b){var c={};for(var d in b)c[b[d]]=d;return c};goog.object.PROTOTYPE_FIELDS_=["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"];goog.object.extend=function(b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)b[c]=d[c];for(var f=0;f<goog.object.PROTOTYPE_FIELDS_.length;f++){c=goog.object.PROTOTYPE_FIELDS_[f];if(Object.prototype.hasOwnProperty.call(d,c))b[c]=d[c]}}};
goog.object.create=function(){var b=arguments.length;if(b==1&&goog.isArray(arguments[0]))return goog.object.create.apply(null,arguments[0]);if(b%2)throw Error("Uneven number of arguments");for(var c={},d=0;d<b;d+=2)c[arguments[d]]=arguments[d+1];return c};goog.object.createSet=function(){var b=arguments.length;if(b==1&&goog.isArray(arguments[0]))return goog.object.createSet.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=true;return c};goog.userAgent={};goog.userAgent.ASSUME_IE=false;goog.userAgent.ASSUME_GECKO=false;goog.userAgent.ASSUME_WEBKIT=false;goog.userAgent.ASSUME_MOBILE_WEBKIT=false;goog.userAgent.ASSUME_OPERA=false;goog.userAgent.BROWSER_KNOWN_=goog.userAgent.ASSUME_IE||goog.userAgent.ASSUME_GECKO||goog.userAgent.ASSUME_MOBILE_WEBKIT||goog.userAgent.ASSUME_WEBKIT||goog.userAgent.ASSUME_OPERA;goog.userAgent.getUserAgentString=function(){return goog.global.navigator?goog.global.navigator.userAgent:null};
goog.userAgent.getNavigator=function(){return goog.global.navigator};
goog.userAgent.init_=function(){goog.userAgent.detectedOpera_=false;goog.userAgent.detectedIe_=false;goog.userAgent.detectedWebkit_=false;goog.userAgent.detectedMobile_=false;goog.userAgent.detectedGecko_=false;var b;if(!goog.userAgent.BROWSER_KNOWN_&&(b=goog.userAgent.getUserAgentString())){var c=goog.userAgent.getNavigator();goog.userAgent.detectedOpera_=b.indexOf("Opera")==0;goog.userAgent.detectedIe_=!goog.userAgent.detectedOpera_&&b.indexOf("MSIE")!=-1;goog.userAgent.detectedWebkit_=!goog.userAgent.detectedOpera_&&
b.indexOf("WebKit")!=-1;goog.userAgent.detectedMobile_=goog.userAgent.detectedWebkit_&&b.indexOf("Mobile")!=-1;goog.userAgent.detectedGecko_=!goog.userAgent.detectedOpera_&&!goog.userAgent.detectedWebkit_&&c.product=="Gecko"}};goog.userAgent.BROWSER_KNOWN_||goog.userAgent.init_();goog.userAgent.OPERA=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_OPERA:goog.userAgent.detectedOpera_;goog.userAgent.IE=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_IE:goog.userAgent.detectedIe_;
goog.userAgent.GECKO=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_GECKO:goog.userAgent.detectedGecko_;goog.userAgent.WEBKIT=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_WEBKIT||goog.userAgent.ASSUME_MOBILE_WEBKIT:goog.userAgent.detectedWebkit_;goog.userAgent.MOBILE=goog.userAgent.ASSUME_MOBILE_WEBKIT||goog.userAgent.detectedMobile_;goog.userAgent.SAFARI=goog.userAgent.WEBKIT;goog.userAgent.determinePlatform_=function(){var b=goog.userAgent.getNavigator();return b&&b.platform||""};
goog.userAgent.PLATFORM=goog.userAgent.determinePlatform_();goog.userAgent.ASSUME_MAC=false;goog.userAgent.ASSUME_WINDOWS=false;goog.userAgent.ASSUME_LINUX=false;goog.userAgent.ASSUME_X11=false;goog.userAgent.PLATFORM_KNOWN_=goog.userAgent.ASSUME_MAC||goog.userAgent.ASSUME_WINDOWS||goog.userAgent.ASSUME_LINUX||goog.userAgent.ASSUME_X11;
goog.userAgent.initPlatform_=function(){goog.userAgent.detectedMac_=goog.string.contains(goog.userAgent.PLATFORM,"Mac");goog.userAgent.detectedWindows_=goog.string.contains(goog.userAgent.PLATFORM,"Win");goog.userAgent.detectedLinux_=goog.string.contains(goog.userAgent.PLATFORM,"Linux");goog.userAgent.detectedX11_=!!goog.userAgent.getNavigator()&&goog.string.contains(goog.userAgent.getNavigator().appVersion||"","X11")};goog.userAgent.PLATFORM_KNOWN_||goog.userAgent.initPlatform_();
goog.userAgent.MAC=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_MAC:goog.userAgent.detectedMac_;goog.userAgent.WINDOWS=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_WINDOWS:goog.userAgent.detectedWindows_;goog.userAgent.LINUX=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_LINUX:goog.userAgent.detectedLinux_;goog.userAgent.X11=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_X11:goog.userAgent.detectedX11_;
goog.userAgent.determineVersion_=function(){var b="",c;if(goog.userAgent.OPERA&&goog.global.opera){b=goog.global.opera.version;b=typeof b=="function"?b():b}else{if(goog.userAgent.GECKO)c=/rv\:([^\);]+)(\)|;)/;else if(goog.userAgent.IE)c=/MSIE\s+([^\);]+)(\)|;)/;else if(goog.userAgent.WEBKIT)c=/WebKit\/(\S+)/;if(c)b=(b=c.exec(goog.userAgent.getUserAgentString()))?b[1]:""}return b};goog.userAgent.VERSION=goog.userAgent.determineVersion_();
goog.userAgent.compare=function(b,c){return goog.string.compareVersions(b,c)};goog.userAgent.isVersionCache_={};goog.userAgent.isVersion=function(b){return goog.userAgent.isVersionCache_[b]||(goog.userAgent.isVersionCache_[b]=goog.string.compareVersions(goog.userAgent.VERSION,b)>=0)};goog.dom.ASSUME_QUIRKS_MODE=false;goog.dom.ASSUME_STANDARDS_MODE=false;goog.dom.COMPAT_MODE_KNOWN_=goog.dom.ASSUME_QUIRKS_MODE||goog.dom.ASSUME_STANDARDS_MODE;goog.dom.NodeType={ELEMENT:1,ATTRIBUTE:2,TEXT:3,CDATA_SECTION:4,ENTITY_REFERENCE:5,ENTITY:6,PROCESSING_INSTRUCTION:7,COMMENT:8,DOCUMENT:9,DOCUMENT_TYPE:10,DOCUMENT_FRAGMENT:11,NOTATION:12};goog.dom.getDomHelper=function(b){return b?new goog.dom.DomHelper(goog.dom.getOwnerDocument(b)):goog.dom.defaultDomHelper_||(goog.dom.defaultDomHelper_=new goog.dom.DomHelper)};
goog.dom.getDocument=function(){return document};goog.dom.getElement=function(b){return goog.isString(b)?document.getElementById(b):b};goog.dom.$=goog.dom.getElement;goog.dom.getElementsByTagNameAndClass=function(b,c,d){return goog.dom.getElementsByTagNameAndClass_(document,b,c,d)};
goog.dom.getElementsByClass=function(b,c){var d=c||document;if(goog.dom.canUseQuerySelector_(d))return d.querySelectorAll("."+b);else if(d.getElementsByClassName)return d.getElementsByClassName(b);return goog.dom.getElementsByTagNameAndClass_(document,"*",b,c)};goog.dom.getElementByClass=function(b,c){var d=c||document,e=null;return(e=goog.dom.canUseQuerySelector_(d)?d.querySelector("."+b):goog.dom.getElementsByClass(b,c)[0])||null};
goog.dom.canUseQuerySelector_=function(b){return b.querySelectorAll&&b.querySelector&&(!goog.userAgent.WEBKIT||goog.dom.isCss1CompatMode_(document)||goog.userAgent.isVersion("528"))};
goog.dom.getElementsByTagNameAndClass_=function(b,c,d,e){b=e||b;c=c&&c!="*"?c.toUpperCase():"";if(goog.dom.canUseQuerySelector_(b)&&(c||d)){d=c+(d?"."+d:"");return b.querySelectorAll(d)}if(d&&b.getElementsByClassName){b=b.getElementsByClassName(d);if(c){e={};for(var f=0,g=0,h;h=b[g];g++)if(c==h.nodeName)e[f++]=h;e.length=f;return e}else return b}b=b.getElementsByTagName(c||"*");if(d){e={};for(g=f=0;h=b[g];g++){c=h.className;if(typeof c.split=="function"&&goog.array.contains(c.split(/\s+/),d))e[f++]=
h}e.length=f;return e}else return b};goog.dom.$$=goog.dom.getElementsByTagNameAndClass;goog.dom.setProperties=function(b,c){goog.object.forEach(c,function(d,e){if(e=="style")b.style.cssText=d;else if(e=="class")b.className=d;else if(e=="for")b.htmlFor=d;else if(e in goog.dom.DIRECT_ATTRIBUTE_MAP_)b.setAttribute(goog.dom.DIRECT_ATTRIBUTE_MAP_[e],d);else b[e]=d})};
goog.dom.DIRECT_ATTRIBUTE_MAP_={cellpadding:"cellPadding",cellspacing:"cellSpacing",colspan:"colSpan",rowspan:"rowSpan",valign:"vAlign",height:"height",width:"width",usemap:"useMap",frameborder:"frameBorder",type:"type"};goog.dom.getViewportSize=function(b){return goog.dom.getViewportSize_(b||window)};
goog.dom.getViewportSize_=function(b){var c=b.document;if(goog.userAgent.WEBKIT&&!goog.userAgent.isVersion("500")&&!goog.userAgent.MOBILE){if(typeof b.innerHeight=="undefined")b=window;c=b.innerHeight;var d=b.document.documentElement.scrollHeight;if(b==b.top)if(d<c)c-=15;return new goog.math.Size(b.innerWidth,c)}b=goog.dom.isCss1CompatMode_(c);if(goog.userAgent.OPERA&&!goog.userAgent.isVersion("9.50"))b=false;b=b?c.documentElement:c.body;return new goog.math.Size(b.clientWidth,b.clientHeight)};
goog.dom.getDocumentHeight=function(){return goog.dom.getDocumentHeight_(window)};goog.dom.getDocumentHeight_=function(b){var c=b.document,d=0;if(c){b=goog.dom.getViewportSize_(b).height;d=c.body;var e=c.documentElement;if(goog.dom.isCss1CompatMode_(c)&&e.scrollHeight)d=e.scrollHeight!=b?e.scrollHeight:e.offsetHeight;else{c=e.scrollHeight;var f=e.offsetHeight;if(e.clientHeight!=f){c=d.scrollHeight;f=d.offsetHeight}d=c>b?c>f?c:f:c<f?c:f}}return d};
goog.dom.getPageScroll=function(b){b=b||goog.global||window;return goog.dom.getDomHelper(b.document).getDocumentScroll()};goog.dom.getDocumentScroll=function(){return goog.dom.getDocumentScroll_(document)};goog.dom.getDocumentScroll_=function(b){b=goog.dom.getDocumentScrollElement_(b);return new goog.math.Coordinate(b.scrollLeft,b.scrollTop)};goog.dom.getDocumentScrollElement=function(){return goog.dom.getDocumentScrollElement_(document)};
goog.dom.getDocumentScrollElement_=function(b){return!goog.userAgent.WEBKIT&&goog.dom.isCss1CompatMode_(b)?b.documentElement:b.body};goog.dom.getWindow=function(b){return b?goog.dom.getWindow_(b):window};goog.dom.getWindow_=function(b){return b.parentWindow||b.defaultView};goog.dom.createDom=function(){return goog.dom.createDom_(document,arguments)};
goog.dom.createDom_=function(b,c){var d=c[0],e=c[1];if(goog.userAgent.IE&&e&&(e.name||e.type)){d=["<",d];e.name&&d.push(' name="',goog.string.htmlEscape(e.name),'"');if(e.type){d.push(' type="',goog.string.htmlEscape(e.type),'"');var f={};goog.object.extend(f,e);e=f;delete e.type}d.push(">");d=d.join("")}d=b.createElement(d);if(e)if(goog.isString(e))d.className=e;else goog.isArray(e)?goog.dom.classes.add.apply(null,[d].concat(e)):goog.dom.setProperties(d,e);c.length>2&&goog.dom.append_(b,d,c,2);return d};
goog.dom.append_=function(b,c,d,e){function f(h){if(h)c.appendChild(goog.isString(h)?b.createTextNode(h):h)}for(e=e;e<d.length;e++){var g=d[e];goog.isArrayLike(g)&&!goog.dom.isNodeLike(g)?goog.array.forEach(goog.dom.isNodeList(g)?goog.array.clone(g):g,f):f(g)}};goog.dom.$dom=goog.dom.createDom;goog.dom.createElement=function(b){return document.createElement(b)};goog.dom.createTextNode=function(b){return document.createTextNode(b)};
goog.dom.createTable=function(b,c,d){return goog.dom.createTable_(document,b,c,!!d)};goog.dom.createTable_=function(b,c,d,e){for(var f=["<tr>"],g=0;g<d;g++)f.push(e?"<td>&nbsp;</td>":"<td></td>");f.push("</tr>");f=f.join("");d=["<table>"];for(g=0;g<c;g++)d.push(f);d.push("</table>");b=b.createElement(goog.dom.TagName.DIV);b.innerHTML=d.join("");return b.removeChild(b.firstChild)};goog.dom.htmlToDocumentFragment=function(b){return goog.dom.htmlToDocumentFragment_(document,b)};
goog.dom.htmlToDocumentFragment_=function(b,c){var d=b.createElement("div");d.innerHTML=c;if(d.childNodes.length==1)return d.removeChild(d.firstChild);else{for(b=b.createDocumentFragment();d.firstChild;)b.appendChild(d.firstChild);return b}};goog.dom.getCompatMode=function(){return goog.dom.isCss1CompatMode()?"CSS1Compat":"BackCompat"};goog.dom.isCss1CompatMode=function(){return goog.dom.isCss1CompatMode_(document)};
goog.dom.isCss1CompatMode_=function(b){if(goog.dom.COMPAT_MODE_KNOWN_)return goog.dom.ASSUME_STANDARDS_MODE;return b.compatMode=="CSS1Compat"};goog.dom.canHaveChildren=function(b){if(b.nodeType!=goog.dom.NodeType.ELEMENT)return false;if("canHaveChildren"in b)return b.canHaveChildren;switch(b.tagName){case goog.dom.TagName.APPLET:case goog.dom.TagName.AREA:case goog.dom.TagName.BASE:case goog.dom.TagName.BR:case goog.dom.TagName.COL:case goog.dom.TagName.FRAME:case goog.dom.TagName.HR:case goog.dom.TagName.IMG:case goog.dom.TagName.INPUT:case goog.dom.TagName.IFRAME:case goog.dom.TagName.ISINDEX:case goog.dom.TagName.LINK:case goog.dom.TagName.NOFRAMES:case goog.dom.TagName.NOSCRIPT:case goog.dom.TagName.META:case goog.dom.TagName.OBJECT:case goog.dom.TagName.PARAM:case goog.dom.TagName.SCRIPT:case goog.dom.TagName.STYLE:return false}return true};
goog.dom.appendChild=function(b,c){b.appendChild(c)};goog.dom.append=function(b){goog.dom.append_(goog.dom.getOwnerDocument(b),b,arguments,1)};goog.dom.removeChildren=function(b){for(var c;c=b.firstChild;)b.removeChild(c)};goog.dom.insertSiblingBefore=function(b,c){c.parentNode&&c.parentNode.insertBefore(b,c)};goog.dom.insertSiblingAfter=function(b,c){c.parentNode&&c.parentNode.insertBefore(b,c.nextSibling)};goog.dom.removeNode=function(b){return b&&b.parentNode?b.parentNode.removeChild(b):null};
goog.dom.replaceNode=function(b,c){var d=c.parentNode;d&&d.replaceChild(b,c)};goog.dom.flattenElement=function(b){var c,d=b.parentNode;if(d&&d.nodeType!=goog.dom.NodeType.DOCUMENT_FRAGMENT)if(b.removeNode)return b.removeNode(false);else{for(;c=b.firstChild;)d.insertBefore(c,b);return goog.dom.removeNode(b)}};goog.dom.getFirstElementChild=function(b){return goog.dom.getNextElementNode_(b.firstChild,true)};goog.dom.getLastElementChild=function(b){return goog.dom.getNextElementNode_(b.lastChild,false)};
goog.dom.getNextElementSibling=function(b){return goog.dom.getNextElementNode_(b.nextSibling,true)};goog.dom.getPreviousElementSibling=function(b){return goog.dom.getNextElementNode_(b.previousSibling,false)};goog.dom.getNextElementNode_=function(b,c){for(;b&&b.nodeType!=goog.dom.NodeType.ELEMENT;)b=c?b.nextSibling:b.previousSibling;return b};goog.dom.getNextNode=function(b){if(!b)return null;if(b.firstChild)return b.firstChild;for(;b&&!b.nextSibling;)b=b.parentNode;return b?b.nextSibling:null};
goog.dom.getPreviousNode=function(b){if(!b)return null;if(!b.previousSibling)return b.parentNode;for(b=b.previousSibling;b&&b.lastChild;)b=b.lastChild;return b};goog.dom.isNodeLike=function(b){return goog.isObject(b)&&b.nodeType>0};goog.dom.contains=function(b,c){if(b.contains&&c.nodeType==goog.dom.NodeType.ELEMENT)return b==c||b.contains(c);if(typeof b.compareDocumentPosition!="undefined")return b==c||Boolean(b.compareDocumentPosition(c)&16);for(;c&&b!=c;)c=c.parentNode;return c==b};
goog.dom.compareNodeOrder=function(b,c){if(b==c)return 0;if(b.compareDocumentPosition)return b.compareDocumentPosition(c)&2?1:-1;if("sourceIndex"in b||b.parentNode&&"sourceIndex"in b.parentNode){var d=b.nodeType==goog.dom.NodeType.ELEMENT,e=c.nodeType==goog.dom.NodeType.ELEMENT;if(d&&e)return b.sourceIndex-c.sourceIndex;else{var f=b.parentNode,g=c.parentNode;if(f==g)return goog.dom.compareSiblingOrder_(b,c);if(!d&&goog.dom.contains(f,c))return-1*goog.dom.compareParentsDescendantNodeIe_(b,c);if(!e&&
goog.dom.contains(g,b))return goog.dom.compareParentsDescendantNodeIe_(c,b);return(d?b.sourceIndex:f.sourceIndex)-(e?c.sourceIndex:g.sourceIndex)}}e=goog.dom.getOwnerDocument(b);d=e.createRange();d.selectNode(b);d.collapse(true);b=e.createRange();b.selectNode(c);b.collapse(true);return d.compareBoundaryPoints(goog.global.Range.START_TO_END,b)};
goog.dom.compareParentsDescendantNodeIe_=function(b,c){var d=b.parentNode;if(d==c)return-1;for(c=c;c.parentNode!=d;)c=c.parentNode;return goog.dom.compareSiblingOrder_(c,b)};goog.dom.compareSiblingOrder_=function(b,c){for(c=c;c=c.previousSibling;)if(c==b)return-1;return 1};
goog.dom.findCommonAncestor=function(){var b,c=arguments.length;if(c){if(c==1)return arguments[0]}else return null;var d=[],e=Infinity;for(b=0;b<c;b++){for(var f=[],g=arguments[b];g;){f.unshift(g);g=g.parentNode}d.push(f);e=Math.min(e,f.length)}f=null;for(b=0;b<e;b++){g=d[0][b];for(var h=1;h<c;h++)if(g!=d[h][b])return f;f=g}return f};goog.dom.getOwnerDocument=function(b){return b.nodeType==goog.dom.NodeType.DOCUMENT?b:b.ownerDocument||b.document};
goog.dom.getFrameContentDocument=function(b){return b=goog.userAgent.WEBKIT?b.document||b.contentWindow.document:b.contentDocument||b.contentWindow.document};goog.dom.getFrameContentWindow=function(b){return b.contentWindow||goog.dom.getWindow_(goog.dom.getFrameContentDocument(b))};
goog.dom.setTextContent=function(b,c){if("textContent"in b)b.textContent=c;else if(b.firstChild&&b.firstChild.nodeType==goog.dom.NodeType.TEXT){for(;b.lastChild!=b.firstChild;)b.removeChild(b.lastChild);b.firstChild.data=c}else{goog.dom.removeChildren(b);var d=goog.dom.getOwnerDocument(b);b.appendChild(d.createTextNode(c))}};goog.dom.getOuterHtml=function(b){if("outerHTML"in b)return b.outerHTML;else{var c=goog.dom.getOwnerDocument(b);c=c.createElement("div");c.appendChild(b.cloneNode(true));return c.innerHTML}};
goog.dom.findNode=function(b,c){var d=[];return(b=goog.dom.findNodes_(b,c,d,true))?d[0]:undefined};goog.dom.findNodes=function(b,c){var d=[];goog.dom.findNodes_(b,c,d,false);return d};goog.dom.findNodes_=function(b,c,d,e){if(b!=null)for(var f=0,g;g=b.childNodes[f];f++){if(c(g)){d.push(g);if(e)return true}if(goog.dom.findNodes_(g,c,d,e))return true}return false};goog.dom.TAGS_TO_IGNORE_={SCRIPT:1,STYLE:1,HEAD:1,IFRAME:1,OBJECT:1};goog.dom.PREDEFINED_TAG_VALUES_={IMG:" ",BR:"\n"};
goog.dom.isFocusableTabIndex=function(b){var c=b.getAttributeNode("tabindex");if(c&&c.specified){b=b.tabIndex;return goog.isNumber(b)&&b>=0}return false};goog.dom.setFocusableTabIndex=function(b,c){if(c)b.tabIndex=0;else b.removeAttribute("tabIndex")};
goog.dom.getTextContent=function(b){if(goog.userAgent.IE&&"innerText"in b)b=goog.string.canonicalizeNewlines(b.innerText);else{var c=[];goog.dom.getTextContent_(b,c,true);b=c.join("")}b=b.replace(/\xAD/g,"");b=b.replace(/ +/g," ");if(b!=" ")b=b.replace(/^\s*/,"");return b};goog.dom.getRawTextContent=function(b){var c=[];goog.dom.getTextContent_(b,c,false);return c.join("")};
goog.dom.getTextContent_=function(b,c,d){if(!(b.nodeName in goog.dom.TAGS_TO_IGNORE_))if(b.nodeType==goog.dom.NodeType.TEXT)d?c.push(String(b.nodeValue).replace(/(\r\n|\r|\n)/g,"")):c.push(b.nodeValue);else if(b.nodeName in goog.dom.PREDEFINED_TAG_VALUES_)c.push(goog.dom.PREDEFINED_TAG_VALUES_[b.nodeName]);else for(b=b.firstChild;b;){goog.dom.getTextContent_(b,c,d);b=b.nextSibling}};goog.dom.getNodeTextLength=function(b){return goog.dom.getTextContent(b).length};
goog.dom.getNodeTextOffset=function(b,c){c=c||goog.dom.getOwnerDocument(b).body;for(var d=[];b&&b!=c;){for(var e=b;e=e.previousSibling;)d.unshift(goog.dom.getTextContent(e));b=b.parentNode}return goog.string.trimLeft(d.join("")).replace(/ +/g," ").length};
goog.dom.getNodeAtOffset=function(b,c,d){b=[b];for(var e=0,f;b.length>0&&e<c;){f=b.pop();if(!(f.nodeName in goog.dom.TAGS_TO_IGNORE_))if(f.nodeType==goog.dom.NodeType.TEXT){var g=f.nodeValue.replace(/(\r\n|\r|\n)/g,"").replace(/ +/g," ");e+=g.length}else if(f.nodeName in goog.dom.PREDEFINED_TAG_VALUES_)e+=goog.dom.PREDEFINED_TAG_VALUES_[f.nodeName].length;else for(g=f.childNodes.length-1;g>=0;g--)b.push(f.childNodes[g])}if(goog.isObject(d)){d.remainder=f?f.nodeValue.length+c-e-1:0;d.node=f}return f};
goog.dom.isNodeList=function(b){if(b&&typeof b.length=="number")if(goog.isObject(b))return typeof b.item=="function"||typeof b.item=="string";else if(goog.isFunction(b))return typeof b.item=="function";return false};goog.dom.getAncestorByTagNameAndClass=function(b,c,d){var e=c?c.toUpperCase():null;return goog.dom.getAncestor(b,function(f){return(!e||f.nodeName==e)&&(!d||goog.dom.classes.has(f,d))},true)};
goog.dom.getAncestor=function(b,c,d,e){if(!d)b=b.parentNode;d=e==null;for(var f=0;b&&(d||f<=e);){if(c(b))return b;b=b.parentNode;f++}return null};goog.dom.DomHelper=function(b){this.document_=b||goog.global.document||document};a=goog.dom.DomHelper.prototype;a.getDomHelper=goog.dom.getDomHelper;a.setDocument=function(b){this.document_=b};a.getDocument=function(){return this.document_};a.getElement=function(b){return goog.isString(b)?this.document_.getElementById(b):b};a.$=goog.dom.DomHelper.prototype.getElement;
a.getElementsByTagNameAndClass=function(b,c,d){return goog.dom.getElementsByTagNameAndClass_(this.document_,b,c,d)};a.getElementsByClass=function(b,c){c=c||this.document_;return goog.dom.getElementsByClass(b,c)};a.getElementByClass=function(b,c){c=c||this.document_;return goog.dom.getElementByClass(b,c)};a.$$=goog.dom.DomHelper.prototype.getElementsByTagNameAndClass;a.setProperties=goog.dom.setProperties;a.getViewportSize=function(b){return goog.dom.getViewportSize(b||this.getWindow())};
a.getDocumentHeight=function(){return goog.dom.getDocumentHeight_(this.getWindow())};a.createDom=function(){return goog.dom.createDom_(this.document_,arguments)};a.$dom=goog.dom.DomHelper.prototype.createDom;a.createElement=function(b){return this.document_.createElement(b)};a.createTextNode=function(b){return this.document_.createTextNode(b)};a.createTable=function(b,c,d){return goog.dom.createTable_(this.document_,b,c,!!d)};
a.htmlToDocumentFragment=function(b){return goog.dom.htmlToDocumentFragment_(this.document_,b)};a.getCompatMode=function(){return this.isCss1CompatMode()?"CSS1Compat":"BackCompat"};a.isCss1CompatMode=function(){return goog.dom.isCss1CompatMode_(this.document_)};a.getWindow=function(){return goog.dom.getWindow_(this.document_)};a.getDocumentScrollElement=function(){return goog.dom.getDocumentScrollElement_(this.document_)};a.getDocumentScroll=function(){return goog.dom.getDocumentScroll_(this.document_)};
a.appendChild=goog.dom.appendChild;a.append=goog.dom.append;a.removeChildren=goog.dom.removeChildren;a.insertSiblingBefore=goog.dom.insertSiblingBefore;a.insertSiblingAfter=goog.dom.insertSiblingAfter;a.removeNode=goog.dom.removeNode;a.replaceNode=goog.dom.replaceNode;a.flattenElement=goog.dom.flattenElement;a.getFirstElementChild=goog.dom.getFirstElementChild;a.getLastElementChild=goog.dom.getLastElementChild;a.getNextElementSibling=goog.dom.getNextElementSibling;a.getPreviousElementSibling=goog.dom.getPreviousElementSibling;
a.getNextNode=goog.dom.getNextNode;a.getPreviousNode=goog.dom.getPreviousNode;a.isNodeLike=goog.dom.isNodeLike;a.contains=goog.dom.contains;a.getOwnerDocument=goog.dom.getOwnerDocument;a.getFrameContentDocument=goog.dom.getFrameContentDocument;a.getFrameContentWindow=goog.dom.getFrameContentWindow;a.setTextContent=goog.dom.setTextContent;a.findNode=goog.dom.findNode;a.findNodes=goog.dom.findNodes;a.getTextContent=goog.dom.getTextContent;a.getNodeTextLength=goog.dom.getNodeTextLength;
a.getNodeTextOffset=goog.dom.getNodeTextOffset;a.getAncestorByTagNameAndClass=goog.dom.getAncestorByTagNameAndClass;a.getAncestor=goog.dom.getAncestor;goog.math.Box=function(b,c,d,e){this.top=b;this.right=c;this.bottom=d;this.left=e};goog.math.Box.boundingBox=function(){for(var b=new goog.math.Box(arguments[0].y,arguments[0].x,arguments[0].y,arguments[0].x),c=1;c<arguments.length;c++){var d=arguments[c];b.top=Math.min(b.top,d.y);b.right=Math.max(b.right,d.x);b.bottom=Math.max(b.bottom,d.y);b.left=Math.min(b.left,d.x)}return b};goog.math.Box.prototype.clone=function(){return new goog.math.Box(this.top,this.right,this.bottom,this.left)};
if(goog.DEBUG)goog.math.Box.prototype.toString=function(){return"("+this.top+"t, "+this.right+"r, "+this.bottom+"b, "+this.left+"l)"};goog.math.Box.prototype.contains=function(b){return goog.math.Box.contains(this,b)};goog.math.Box.prototype.expand=function(b,c,d,e){if(goog.isObject(b)){this.top-=b.top;this.right+=b.right;this.bottom+=b.bottom;this.left-=b.left}else{this.top-=b;this.right+=c;this.bottom+=d;this.left-=e}return this};
goog.math.Box.prototype.expandToInclude=function(b){this.left=Math.min(this.left,b.left);this.top=Math.min(this.top,b.top);this.right=Math.max(this.right,b.right);this.bottom=Math.max(this.bottom,b.bottom)};goog.math.Box.equals=function(b,c){if(b==c)return true;if(!b||!c)return false;return b.top==c.top&&b.right==c.right&&b.bottom==c.bottom&&b.left==c.left};
goog.math.Box.contains=function(b,c){if(!b||!c)return false;if(c instanceof goog.math.Box)return c.left>=b.left&&c.right<=b.right&&c.top>=b.top&&c.bottom<=b.bottom;return c.x>=b.left&&c.x<=b.right&&c.y>=b.top&&c.y<=b.bottom};
goog.math.Box.distance=function(b,c){if(c.x>=b.left&&c.x<=b.right){if(c.y>=b.top&&c.y<=b.bottom)return 0;return c.y<b.top?b.top-c.y:c.y-b.bottom}if(c.y>=b.top&&c.y<=b.bottom)return c.x<b.left?b.left-c.x:c.x-b.right;return goog.math.Coordinate.distance(c,new goog.math.Coordinate(c.x<b.left?b.left:b.right,c.y<b.top?b.top:b.bottom))};goog.math.Box.intersects=function(b,c){return b.left<=c.right&&c.left<=b.right&&b.top<=c.bottom&&c.top<=b.bottom};goog.math.Rect=function(b,c,d,e){this.left=b;this.top=c;this.width=d;this.height=e};goog.math.Rect.prototype.clone=function(){return new goog.math.Rect(this.left,this.top,this.width,this.height)};goog.math.Rect.prototype.toBox=function(){var b=this.left+this.width,c=this.top+this.height;return new goog.math.Box(this.top,b,c,this.left)};goog.math.Rect.createFromBox=function(b){return new goog.math.Rect(b.left,b.top,b.right-b.left,b.bottom-b.top)};
if(goog.DEBUG)goog.math.Rect.prototype.toString=function(){return"("+this.left+", "+this.top+" - "+this.width+"w x "+this.height+"h)"};goog.math.Rect.equals=function(b,c){if(b==c)return true;if(!b||!c)return false;return b.left==c.left&&b.width==c.width&&b.top==c.top&&b.height==c.height};
goog.math.Rect.prototype.intersection=function(b){var c=Math.max(this.left,b.left),d=Math.min(this.left+this.width,b.left+b.width);if(c<=d){var e=Math.max(this.top,b.top);b=Math.min(this.top+this.height,b.top+b.height);if(e<=b){this.left=c;this.top=e;this.width=d-c;this.height=b-e;return true}}return false};
goog.math.Rect.intersection=function(b,c){var d=Math.max(b.left,c.left),e=Math.min(b.left+b.width,c.left+c.width);if(d<=e){var f=Math.max(b.top,c.top);b=Math.min(b.top+b.height,c.top+c.height);if(f<=b)return new goog.math.Rect(d,f,e-d,b-f)}return null};goog.math.Rect.intersects=function(b,c){return b.left<=c.left+c.width&&c.left<=b.left+b.width&&b.top<=c.top+c.height&&c.top<=b.top+b.height};goog.math.Rect.prototype.intersects=function(b){return goog.math.Rect.intersects(this,b)};
goog.math.Rect.difference=function(b,c){var d=goog.math.Rect.intersection(b,c);if(!d||!d.height||!d.width)return[b.clone()];d=[];var e=b.top,f=b.height,g=b.left+b.width,h=b.top+b.height,i=c.left+c.width,j=c.top+c.height;if(c.top>b.top){d.push(new goog.math.Rect(b.left,b.top,b.width,c.top-b.top));e=c.top;f-=c.top-b.top}if(j<h){d.push(new goog.math.Rect(b.left,j,b.width,h-j));f=j-e}c.left>b.left&&d.push(new goog.math.Rect(b.left,e,c.left-b.left,f));i<g&&d.push(new goog.math.Rect(i,e,g-i,f));return d};
goog.math.Rect.prototype.difference=function(b){return goog.math.Rect.difference(this,b)};goog.math.Rect.prototype.boundingRect=function(b){var c=Math.max(this.left+this.width,b.left+b.width),d=Math.max(this.top+this.height,b.top+b.height);this.left=Math.min(this.left,b.left);this.top=Math.min(this.top,b.top);this.width=c-this.left;this.height=d-this.top};goog.math.Rect.boundingRect=function(b,c){if(!b||!c)return null;b=b.clone();b.boundingRect(c);return b};
goog.math.Rect.prototype.contains=function(b){return b instanceof goog.math.Rect?this.left<=b.left&&this.left+this.width>=b.left+b.width&&this.top<=b.top&&this.top+this.height>=b.top+b.height:b.x>=this.left&&b.x<=this.left+this.width&&b.y>=this.top&&b.y<=this.top+this.height};goog.math.Rect.prototype.getSize=function(){return new goog.math.Size(this.width,this.height)};goog.style={};goog.style.setStyle=function(b,c,d){goog.isString(c)?goog.style.setStyle_(b,d,c):goog.object.forEach(c,goog.partial(goog.style.setStyle_,b))};goog.style.setStyle_=function(b,c,d){b.style[goog.style.toCamelCase(d)]=c};goog.style.getStyle=function(b,c){return b.style[goog.style.toCamelCase(c)]};goog.style.getComputedStyle=function(b,c){var d=goog.dom.getOwnerDocument(b);if(d.defaultView&&d.defaultView.getComputedStyle)if(b=d.defaultView.getComputedStyle(b,""))return b[c];return null};
goog.style.getCascadedStyle=function(b,c){return b.currentStyle?b.currentStyle[c]:null};goog.style.getStyle_=function(b,c){return goog.style.getComputedStyle(b,c)||goog.style.getCascadedStyle(b,c)||b.style[c]};goog.style.getComputedPosition=function(b){return goog.style.getStyle_(b,"position")};goog.style.getBackgroundColor=function(b){return goog.style.getStyle_(b,"backgroundColor")};goog.style.getComputedOverflowX=function(b){return goog.style.getStyle_(b,"overflowX")};
goog.style.getComputedOverflowY=function(b){return goog.style.getStyle_(b,"overflowY")};goog.style.getComputedZIndex=function(b){return goog.style.getStyle_(b,"zIndex")};goog.style.getComputedTextAlign=function(b){return goog.style.getStyle_(b,"textAlign")};goog.style.getComputedCursor=function(b){return goog.style.getStyle_(b,"cursor")};
goog.style.setPosition=function(b,c,d){var e,f=goog.userAgent.GECKO&&(goog.userAgent.MAC||goog.userAgent.X11)&&goog.userAgent.isVersion("1.9");if(c instanceof goog.math.Coordinate){e=c.x;c=c.y}else{e=c;c=d}b.style.left=goog.style.getPixelStyleValue_(e,f);b.style.top=goog.style.getPixelStyleValue_(c,f)};goog.style.getPosition=function(b){return new goog.math.Coordinate(b.offsetLeft,b.offsetTop)};
goog.style.getClientViewportElement=function(b){b=b?b.nodeType==goog.dom.NodeType.DOCUMENT?b:goog.dom.getOwnerDocument(b):goog.dom.getDocument();if(goog.userAgent.IE&&!goog.dom.getDomHelper(b).isCss1CompatMode())return b.body;return b.documentElement};goog.style.getBoundingClientRect_=function(b){var c=b.getBoundingClientRect();if(goog.userAgent.IE){b=b.ownerDocument;c.left-=b.documentElement.clientLeft+b.body.clientLeft;c.top-=b.documentElement.clientTop+b.body.clientTop}return c};
goog.style.getOffsetParent=function(b){if(goog.userAgent.IE)return b.offsetParent;var c=goog.dom.getOwnerDocument(b),d=goog.style.getStyle_(b,"position"),e=d=="fixed"||d=="absolute";for(b=b.parentNode;b&&b!=c;b=b.parentNode){d=goog.style.getStyle_(b,"position");e=e&&d=="static"&&b!=c.documentElement&&b!=c.body;if(!e&&(b.scrollWidth>b.clientWidth||b.scrollHeight>b.clientHeight||d=="fixed"||d=="absolute"))return b}return null};
goog.style.getVisibleRectForElement=function(b){var c=new goog.math.Box(0,Infinity,Infinity,0),d=goog.dom.getDomHelper(b),e=d.getDocument().body,f=d.getDocumentScrollElement(),g;for(b=b;b=goog.style.getOffsetParent(b);)if((!goog.userAgent.IE||b.clientWidth!=0)&&(!goog.userAgent.WEBKIT||b.clientHeight!=0||b!=e)&&(b.scrollWidth!=b.clientWidth||b.scrollHeight!=b.clientHeight)&&goog.style.getStyle_(b,"overflow")!="visible"){var h=goog.style.getPageOffset(b),i=goog.style.getClientLeftTop(b);h.x+=i.x;h.y+=
i.y;c.top=Math.max(c.top,h.y);c.right=Math.min(c.right,h.x+b.clientWidth);c.bottom=Math.min(c.bottom,h.y+b.clientHeight);c.left=Math.max(c.left,h.x);g=g||b!=f}e=f.scrollLeft;f=f.scrollTop;if(goog.userAgent.WEBKIT){c.left+=e;c.top+=f}else{c.left=Math.max(c.left,e);c.top=Math.max(c.top,f)}if(!g||goog.userAgent.WEBKIT){c.right+=e;c.bottom+=f}d=d.getViewportSize();c.right=Math.min(c.right,e+d.width);c.bottom=Math.min(c.bottom,f+d.height);return c.top>=0&&c.left>=0&&c.bottom>c.top&&c.right>c.left?c:null};
goog.style.scrollIntoContainerView=function(b,c,d){var e=goog.style.getPageOffset(b),f=goog.style.getPageOffset(c),g=goog.style.getBorderBox(c),h=e.x-f.x-g.left;e=e.y-f.y-g.top;f=c.clientWidth-b.offsetWidth;b=c.clientHeight-b.offsetHeight;if(d){c.scrollLeft+=h-f/2;c.scrollTop+=e-b/2}else{c.scrollLeft+=Math.min(h,Math.max(h-f,0));c.scrollTop+=Math.min(e,Math.max(e-b,0))}};
goog.style.getClientLeftTop=function(b){if(goog.userAgent.GECKO&&!goog.userAgent.isVersion("1.9")){var c=parseFloat(goog.style.getComputedStyle(b,"borderLeftWidth"));if(goog.style.isRightToLeft(b)){var d=b.offsetWidth-b.clientWidth-c-parseFloat(goog.style.getComputedStyle(b,"borderRightWidth"));c+=d}return new goog.math.Coordinate(c,parseFloat(goog.style.getComputedStyle(b,"borderTopWidth")))}return new goog.math.Coordinate(b.clientLeft,b.clientTop)};
goog.style.getPageOffset=function(b){var c,d=goog.dom.getOwnerDocument(b),e=goog.style.getStyle_(b,"position"),f=goog.userAgent.GECKO&&d.getBoxObjectFor&&!b.getBoundingClientRect&&e=="absolute"&&(c=d.getBoxObjectFor(b))&&(c.screenX<0||c.screenY<0),g=new goog.math.Coordinate(0,0),h=goog.style.getClientViewportElement(d);if(b==h)return g;if(b.getBoundingClientRect){c=goog.style.getBoundingClientRect_(b);b=goog.dom.getDomHelper(d).getDocumentScroll();g.x=c.left+b.x;g.y=c.top+b.y}else if(d.getBoxObjectFor&&
!f){c=d.getBoxObjectFor(b);b=d.getBoxObjectFor(h);g.x=c.screenX-b.screenX;g.y=c.screenY-b.screenY}else{c=b;do{g.x+=c.offsetLeft;g.y+=c.offsetTop;if(c!=b){g.x+=c.clientLeft||0;g.y+=c.clientTop||0}if(goog.userAgent.WEBKIT&&goog.style.getComputedPosition(c)=="fixed"){g.x+=d.body.scrollLeft;g.y+=d.body.scrollTop;break}c=c.offsetParent}while(c&&c!=b);if(goog.userAgent.OPERA||goog.userAgent.WEBKIT&&e=="absolute")g.y-=d.body.offsetTop;for(c=b;(c=goog.style.getOffsetParent(c))&&c!=d.body&&c!=h;){g.x-=c.scrollLeft;
if(!goog.userAgent.OPERA||c.tagName!="TR")g.y-=c.scrollTop}}return g};goog.style.getPageOffsetLeft=function(b){return goog.style.getPageOffset(b).x};goog.style.getPageOffsetTop=function(b){return goog.style.getPageOffset(b).y};
goog.style.getFramedPageOffset=function(b,c){var d=new goog.math.Coordinate(0,0),e=goog.dom.getWindow(goog.dom.getOwnerDocument(b));b=b;do{var f=e==c?goog.style.getPageOffset(b):goog.style.getClientPosition(b);d.x+=f.x;d.y+=f.y}while(e&&e!=c&&(b=e.frameElement)&&(e=e.parent));return d};
goog.style.translateRectForAnotherFrame=function(b,c,d){if(c.getDocument()!=d.getDocument()){var e=c.getDocument().body;d=goog.style.getFramedPageOffset(e,d.getWindow());d=goog.math.Coordinate.difference(d,goog.style.getPageOffset(e));if(goog.userAgent.IE&&!c.isCss1CompatMode())d=goog.math.Coordinate.difference(d,c.getDocumentScroll());b.left+=d.x;b.top+=d.y}};
goog.style.getRelativePosition=function(b,c){b=goog.style.getClientPosition(b);c=goog.style.getClientPosition(c);return new goog.math.Coordinate(b.x-c.x,b.y-c.y)};goog.style.getClientPosition=function(b){var c=new goog.math.Coordinate;if(b.nodeType==goog.dom.NodeType.ELEMENT)if(b.getBoundingClientRect){var d=goog.style.getBoundingClientRect_(b);c.x=d.left;c.y=d.top}else{d=goog.dom.getDomHelper(b).getDocumentScroll();b=goog.style.getPageOffset(b);c.x=b.x-d.x;c.y=b.y-d.y}else{c.x=b.clientX;c.y=b.clientY}return c};
goog.style.setPageOffset=function(b,c,d){var e=goog.style.getPageOffset(b);if(c instanceof goog.math.Coordinate){d=c.y;c=c.x}c=c-e.x;d=d-e.y;goog.style.setPosition(b,b.offsetLeft+c,b.offsetTop+d)};goog.style.setSize=function(b,c,d){if(c instanceof goog.math.Size){d=c.height;c=c.width}else{if(d==undefined)throw Error("missing height argument");d=d}goog.style.setWidth(b,c);goog.style.setHeight(b,d)};goog.style.getPixelStyleValue_=function(b,c){if(typeof b=="number")b=(c?Math.round(b):b)+"px";return b};
goog.style.setHeight=function(b,c){b.style.height=goog.style.getPixelStyleValue_(c,true)};goog.style.setWidth=function(b,c){b.style.width=goog.style.getPixelStyleValue_(c,true)};
goog.style.getSize=function(b){var c=goog.userAgent.OPERA&&!goog.userAgent.isVersion("10");if(goog.style.getStyle_(b,"display")!="none")return c?new goog.math.Size(b.offsetWidth||b.clientWidth,b.offsetHeight||b.clientHeight):new goog.math.Size(b.offsetWidth,b.offsetHeight);var d=b.style,e=d.display,f=d.visibility,g=d.position;d.visibility="hidden";d.position="absolute";d.display="inline";if(c){c=b.offsetWidth||b.clientWidth;b=b.offsetHeight||b.clientHeight}else{c=b.offsetWidth;b=b.offsetHeight}d.display=
e;d.position=g;d.visibility=f;return new goog.math.Size(c,b)};goog.style.getBounds=function(b){var c=goog.style.getPageOffset(b);b=goog.style.getSize(b);return new goog.math.Rect(c.x,c.y,b.width,b.height)};goog.style.toCamelCaseCache_={};goog.style.toCamelCase=function(b){return goog.style.toCamelCaseCache_[b]||(goog.style.toCamelCaseCache_[b]=String(b).replace(/\-([a-z])/g,function(c,d){return d.toUpperCase()}))};goog.style.toSelectorCaseCache_={};
goog.style.toSelectorCase=function(b){return goog.style.toSelectorCaseCache_[b]||(goog.style.toSelectorCaseCache_[b]=b.replace(/([A-Z])/g,"-$1").toLowerCase())};goog.style.getOpacity=function(b){var c=b.style;b="";if("opacity"in c)b=c.opacity;else if("MozOpacity"in c)b=c.MozOpacity;else if("filter"in c)if(c=c.filter.match(/alpha\(opacity=([\d.]+)\)/))b=String(c[1]/100);return b==""?b:Number(b)};
goog.style.setOpacity=function(b,c){b=b.style;if("opacity"in b)b.opacity=c;else if("MozOpacity"in b)b.MozOpacity=c;else if("filter"in b)b.filter=c===""?"":"alpha(opacity="+c*100+")"};goog.style.setTransparentBackgroundImage=function(b,c){b=b.style;if(goog.userAgent.IE&&!goog.userAgent.isVersion("8"))b.filter='progid:DXImageTransform.Microsoft.AlphaImageLoader(src="'+c+'", sizingMethod="crop")';else{b.backgroundImage="url("+c+")";b.backgroundPosition="top left";b.backgroundRepeat="no-repeat"}};
goog.style.clearTransparentBackgroundImage=function(b){b=b.style;if("filter"in b)b.filter="";else b.backgroundImage="none"};goog.style.showElement=function(b,c){b.style.display=c?"":"none"};goog.style.isElementShown=function(b){return b.style.display!="none"};
goog.style.installStyles=function(b,c){c=goog.dom.getDomHelper(c);var d=null;if(goog.userAgent.IE){d=c.getDocument().createStyleSheet();goog.style.setStyles(d,b)}else{var e=c.getElementsByTagNameAndClass("head")[0];if(!e){d=c.getElementsByTagNameAndClass("body")[0];e=c.createDom("head");d.parentNode.insertBefore(e,d)}d=c.createDom("style");goog.style.setStyles(d,b);c.appendChild(e,d)}return d};goog.style.uninstallStyles=function(b){b=b.ownerNode||b.owningElement||b;goog.dom.removeNode(b)};
goog.style.setStyles=function(b,c){if(goog.userAgent.IE)b.cssText=c;else{var d=goog.userAgent.WEBKIT?"innerText":"innerHTML";b[d]=c}};goog.style.setPreWrap=function(b){b=b.style;if(goog.userAgent.IE&&!goog.userAgent.isVersion("8")){b.whiteSpace="pre";b.wordWrap="break-word"}else b.whiteSpace=goog.userAgent.GECKO?"-moz-pre-wrap":goog.userAgent.OPERA?"-o-pre-wrap":"pre-wrap"};
goog.style.setInlineBlock=function(b){b=b.style;b.position="relative";if(goog.userAgent.IE&&!goog.userAgent.isVersion("8")){b.zoom="1";b.display="inline"}else b.display=goog.userAgent.GECKO?goog.userAgent.isVersion("1.9a")?"inline-block":"-moz-inline-box":"inline-block"};goog.style.isRightToLeft=function(b){return"rtl"==goog.style.getStyle_(b,"direction")};goog.style.unselectableStyle_=goog.userAgent.GECKO?"MozUserSelect":goog.userAgent.WEBKIT?"WebkitUserSelect":null;
goog.style.isUnselectable=function(b){if(goog.style.unselectableStyle_)return b.style[goog.style.unselectableStyle_].toLowerCase()=="none";else if(goog.userAgent.IE||goog.userAgent.OPERA)return b.getAttribute("unselectable")=="on";return false};
goog.style.setUnselectable=function(b,c,d){d=!d?b.getElementsByTagName("*"):null;var e=goog.style.unselectableStyle_;if(e){c=c?"none":"";b.style[e]=c;if(d){b=0;for(var f;f=d[b];b++)f.style[e]=c}}else if(goog.userAgent.IE||goog.userAgent.OPERA){c=c?"on":"";b.setAttribute("unselectable",c);if(d)for(b=0;f=d[b];b++)f.setAttribute("unselectable",c)}};goog.style.getBorderBoxSize=function(b){return new goog.math.Size(b.offsetWidth,b.offsetHeight)};
goog.style.setBorderBoxSize=function(b,c){var d=goog.dom.getOwnerDocument(b),e=goog.dom.getDomHelper(d).isCss1CompatMode();if(goog.userAgent.IE&&(!e||!goog.userAgent.isVersion("8"))){d=b.style;if(e){e=goog.style.getPaddingBox(b);b=goog.style.getBorderBox(b);d.pixelWidth=c.width-b.left-e.left-e.right-b.right;d.pixelHeight=c.height-b.top-e.top-e.bottom-b.bottom}else{d.pixelWidth=c.width;d.pixelHeight=c.height}}else goog.style.setBoxSizingSize_(b,c,"border-box")};
goog.style.getContentBoxSize=function(b){var c=goog.dom.getOwnerDocument(b),d=goog.userAgent.IE&&b.currentStyle;if(d&&goog.dom.getDomHelper(c).isCss1CompatMode()&&d.width!="auto"&&d.height!="auto"&&!d.boxSizing){c=goog.style.getIePixelValue_(b,d.width,"width","pixelWidth");b=goog.style.getIePixelValue_(b,d.height,"height","pixelHeight");return new goog.math.Size(c,b)}else{d=goog.style.getBorderBoxSize(b);c=goog.style.getPaddingBox(b);b=goog.style.getBorderBox(b);return new goog.math.Size(d.width-
b.left-c.left-c.right-b.right,d.height-b.top-c.top-c.bottom-b.bottom)}};
goog.style.setContentBoxSize=function(b,c){var d=goog.dom.getOwnerDocument(b),e=goog.dom.getDomHelper(d).isCss1CompatMode();if(goog.userAgent.IE&&(!e||!goog.userAgent.isVersion("8"))){d=b.style;if(e){d.pixelWidth=c.width;d.pixelHeight=c.height}else{e=goog.style.getPaddingBox(b);b=goog.style.getBorderBox(b);d.pixelWidth=c.width+b.left+e.left+e.right+b.right;d.pixelHeight=c.height+b.top+e.top+e.bottom+b.bottom}}else goog.style.setBoxSizingSize_(b,c,"content-box")};
goog.style.setBoxSizingSize_=function(b,c,d){b=b.style;if(goog.userAgent.GECKO)b.MozBoxSizing=d;else if(goog.userAgent.WEBKIT)b.WebkitBoxSizing=d;else if(goog.userAgent.OPERA&&!goog.userAgent.isVersion("9.50"))d?b.setProperty("box-sizing",d):b.removeProperty("box-sizing");else b.boxSizing=d;b.width=c.width+"px";b.height=c.height+"px"};
goog.style.getIePixelValue_=function(b,c,d,e){if(/^\d+px?$/.test(c))return parseInt(c,10);else{var f=b.style[d],g=b.runtimeStyle[d];b.runtimeStyle[d]=b.currentStyle[d];b.style[d]=c;c=b.style[e];b.style[d]=f;b.runtimeStyle[d]=g;return c}};goog.style.getIePixelDistance_=function(b,c){return goog.style.getIePixelValue_(b,goog.style.getCascadedStyle(b,c),"left","pixelLeft")};
goog.style.getBox_=function(b,c){if(goog.userAgent.IE){var d=goog.style.getIePixelDistance_(b,c+"Left"),e=goog.style.getIePixelDistance_(b,c+"Right"),f=goog.style.getIePixelDistance_(b,c+"Top");b=goog.style.getIePixelDistance_(b,c+"Bottom");return new goog.math.Box(f,e,b,d)}else{d=goog.style.getComputedStyle(b,c+"Left");e=goog.style.getComputedStyle(b,c+"Right");f=goog.style.getComputedStyle(b,c+"Top");b=goog.style.getComputedStyle(b,c+"Bottom");return new goog.math.Box(parseFloat(f),parseFloat(e),
parseFloat(b),parseFloat(d))}};goog.style.getPaddingBox=function(b){return goog.style.getBox_(b,"padding")};goog.style.getMarginBox=function(b){return goog.style.getBox_(b,"margin")};goog.style.ieBorderWidthKeywords_={thin:2,medium:4,thick:6};
goog.style.getIePixelBorder_=function(b,c){if(goog.style.getCascadedStyle(b,c+"Style")=="none")return 0;c=goog.style.getCascadedStyle(b,c+"Width");if(c in goog.style.ieBorderWidthKeywords_)return goog.style.ieBorderWidthKeywords_[c];return goog.style.getIePixelValue_(b,c,"left","pixelLeft")};
goog.style.getBorderBox=function(b){if(goog.userAgent.IE){var c=goog.style.getIePixelBorder_(b,"borderLeft"),d=goog.style.getIePixelBorder_(b,"borderRight"),e=goog.style.getIePixelBorder_(b,"borderTop");b=goog.style.getIePixelBorder_(b,"borderBottom");return new goog.math.Box(e,d,b,c)}else{c=goog.style.getComputedStyle(b,"borderLeftWidth");d=goog.style.getComputedStyle(b,"borderRightWidth");e=goog.style.getComputedStyle(b,"borderTopWidth");b=goog.style.getComputedStyle(b,"borderBottomWidth");return new goog.math.Box(parseFloat(e),
parseFloat(d),parseFloat(b),parseFloat(c))}};goog.style.getFontFamily=function(b){var c=goog.dom.getOwnerDocument(b),d="";if(c.body.createTextRange){d=c.body.createTextRange();d.moveToElementText(b);d=d.queryCommandValue("FontName")}if(!d){d=goog.style.getStyle_(b,"fontFamily");if(goog.userAgent.OPERA&&goog.userAgent.LINUX)d=d.replace(/ \[[^\]]*\]/,"")}b=d.split(",");if(b.length>1)d=b[0];return goog.string.stripQuotes(d,"\"'")};goog.style.lengthUnitRegex_=/[^\d]+$/;
goog.style.getLengthUnits=function(b){return(b=b.match(goog.style.lengthUnitRegex_))&&b[0]||null};goog.style.ABSOLUTE_CSS_LENGTH_UNITS_={cm:1,"in":1,mm:1,pc:1,pt:1};goog.style.CONVERTIBLE_RELATIVE_CSS_UNITS_={em:1,ex:1};
goog.style.getFontSize=function(b){var c=goog.style.getStyle_(b,"fontSize"),d=goog.style.getLengthUnits(c);if(c&&"px"==d)return parseInt(c,10);if(goog.userAgent.IE)if(d in goog.style.ABSOLUTE_CSS_LENGTH_UNITS_)return goog.style.getIePixelValue_(b,c,"left","pixelLeft");else if(b.parentNode&&b.parentNode.nodeType==goog.dom.NodeType.ELEMENT&&d in goog.style.CONVERTIBLE_RELATIVE_CSS_UNITS_){b=b.parentNode;d=goog.style.getStyle_(b,"fontSize");return goog.style.getIePixelValue_(b,c==d?"1em":c,"left","pixelLeft")}d=
goog.dom.createDom("span",{style:"visibility:hidden;position:absolute;line-height:0;padding:0;margin:0;border:0;height:1em;"});goog.dom.appendChild(b,d);c=d.offsetHeight;goog.dom.removeNode(d);return c};goog.style.parseStyleAttribute=function(b){var c={};goog.array.forEach(b.split(/\s*;\s*/),function(d){d=d.split(/\s*:\s*/);if(d.length==2)c[goog.style.toCamelCase(d[0].toLowerCase())]=d[1]});return c};
goog.style.toStyleAttribute=function(b){var c=[];goog.object.forEach(b,function(d,e){c.push(goog.style.toSelectorCase(e),":",d,";")});return c.join("")};goog.style.setFloat=function(b,c){b.style[goog.userAgent.IE?"styleFloat":"cssFloat"]=c};goog.style.getFloat=function(b){return b.style[goog.userAgent.IE?"styleFloat":"cssFloat"]||""};
goog.style.getScrollbarWidth=function(){var b=goog.dom.createElement("div");b.style.cssText="visibility:hidden;overflow:scroll;position:absolute;top:0;width:100px;height:100px";goog.dom.appendChild(goog.dom.getDocument().body,b);var c=b.offsetWidth-b.clientWidth;goog.dom.removeNode(b);return c};goog.Disposable=function(){};a=goog.Disposable.prototype;a.disposed_=false;a.isDisposed=function(){return this.disposed_};a.getDisposed=goog.Disposable.prototype.isDisposed;a.dispose=function(){if(!this.disposed_){this.disposed_=true;this.disposeInternal()}};a.disposeInternal=function(){};goog.dispose=function(b){b&&typeof b.dispose=="function"&&b.dispose()};goog.debug.entryPointRegistry={};goog.debug.EntryPointMonitor=function(){};goog.debug.entryPointRegistry.refList_=[];goog.debug.entryPointRegistry.register=function(b){goog.debug.entryPointRegistry.refList_[goog.debug.entryPointRegistry.refList_.length]=b};goog.debug.entryPointRegistry.monitorAll=function(b){b=goog.bind(b.wrap,b);for(var c=0;c<goog.debug.entryPointRegistry.refList_.length;c++)goog.debug.entryPointRegistry.refList_[c](b)};
goog.debug.entryPointRegistry.unmonitorAllIfPossible=function(b){b=goog.bind(b.unwrap,b);for(var c=0;c<goog.debug.entryPointRegistry.refList_.length;c++)goog.debug.entryPointRegistry.refList_[c](b)};goog.debug.errorHandlerWeakDep={protectEntryPoint:function(b){return b}};goog.events={};goog.events.Event=function(b,c){goog.Disposable.call(this);this.type=b;this.currentTarget=this.target=c};goog.inherits(goog.events.Event,goog.Disposable);a=goog.events.Event.prototype;a.disposeInternal=function(){delete this.type;delete this.target;delete this.currentTarget};a.propagationStopped_=false;a.returnValue_=true;a.stopPropagation=function(){this.propagationStopped_=true};a.preventDefault=function(){this.returnValue_=false};goog.events.Event.stopPropagation=function(b){b.stopPropagation()};
goog.events.Event.preventDefault=function(b){b.preventDefault()};goog.events.BrowserEvent=function(b,c){b&&this.init(b,c)};goog.inherits(goog.events.BrowserEvent,goog.events.Event);goog.events.BrowserEvent.MouseButton={LEFT:0,MIDDLE:1,RIGHT:2};goog.events.BrowserEvent.IEButtonMap_=[1,4,2];a=goog.events.BrowserEvent.prototype;a.target=null;a.relatedTarget=null;a.offsetX=0;a.offsetY=0;a.clientX=0;a.clientY=0;a.screenX=0;a.screenY=0;a.button=0;a.keyCode=0;a.charCode=0;a.ctrlKey=false;a.altKey=false;a.shiftKey=false;a.metaKey=false;a.platformModifierKey=false;
a.event_=null;
a.init=function(b,c){var d=this.type=b.type;this.target=b.target||b.srcElement;this.currentTarget=c;if(c=b.relatedTarget){if(goog.userAgent.GECKO)try{c=c.nodeName&&c}catch(e){c=null}}else if(d=="mouseover")c=b.fromElement;else if(d=="mouseout")c=b.toElement;this.relatedTarget=c;this.offsetX=b.offsetX!==undefined?b.offsetX:b.layerX;this.offsetY=b.offsetY!==undefined?b.offsetY:b.layerY;this.clientX=b.clientX!==undefined?b.clientX:b.pageX;this.clientY=b.clientY!==undefined?b.clientY:b.pageY;this.screenX=
b.screenX||0;this.screenY=b.screenY||0;this.button=b.button;this.keyCode=b.keyCode||0;this.charCode=b.charCode||(d=="keypress"?b.keyCode:0);this.ctrlKey=b.ctrlKey;this.altKey=b.altKey;this.shiftKey=b.shiftKey;this.metaKey=b.metaKey;this.platformModifierKey=goog.userAgent.MAC?b.metaKey:b.ctrlKey;this.event_=b;delete this.returnValue_;delete this.propagationStopped_};
a.isButton=function(b){return goog.userAgent.IE?this.type=="click"?b==goog.events.BrowserEvent.MouseButton.LEFT:!!(this.event_.button&goog.events.BrowserEvent.IEButtonMap_[b]):this.event_.button==b};a.stopPropagation=function(){goog.events.BrowserEvent.superClass_.stopPropagation.call(this);if(this.event_.stopPropagation)this.event_.stopPropagation();else this.event_.cancelBubble=true};goog.events.BrowserEvent.IE7_SET_KEY_CODE_TO_PREVENT_DEFAULT_=goog.userAgent.IE&&!goog.userAgent.isVersion("8");
goog.events.BrowserEvent.prototype.preventDefault=function(){goog.events.BrowserEvent.superClass_.preventDefault.call(this);var b=this.event_;if(b.preventDefault)b.preventDefault();else{b.returnValue=false;if(goog.events.BrowserEvent.IE7_SET_KEY_CODE_TO_PREVENT_DEFAULT_)try{var c=112,d=123;if(b.ctrlKey||b.keyCode>=c&&b.keyCode<=d)b.keyCode=-1}catch(e){}}};goog.events.BrowserEvent.prototype.getBrowserEvent=function(){return this.event_};
goog.events.BrowserEvent.prototype.disposeInternal=function(){goog.events.BrowserEvent.superClass_.disposeInternal.call(this);this.relatedTarget=this.currentTarget=this.target=this.event_=null};goog.events.EventWrapper=function(){};goog.events.EventWrapper.prototype.listen=function(){};goog.events.EventWrapper.prototype.unlisten=function(){};goog.events.Listener=function(){};goog.events.Listener.counter_=0;a=goog.events.Listener.prototype;a.key=0;a.removed=false;a.callOnce=false;
a.init=function(b,c,d,e,f,g){if(goog.isFunction(b))this.isFunctionListener_=true;else if(b&&b.handleEvent&&goog.isFunction(b.handleEvent))this.isFunctionListener_=false;else throw Error("Invalid listener argument");this.listener=b;this.proxy=c;this.src=d;this.type=e;this.capture=!!f;this.handler=g;this.callOnce=false;this.key=++goog.events.Listener.counter_;this.removed=false};
a.handleEvent=function(b){if(this.isFunctionListener_)return this.listener.call(this.handler||this.src,b);return this.listener.handleEvent.call(this.listener,b)};goog.structs={};goog.structs.SimplePool=function(b,c){goog.Disposable.call(this);this.maxCount_=c;this.freeQueue_=[];this.createInitial_(b)};goog.inherits(goog.structs.SimplePool,goog.Disposable);a=goog.structs.SimplePool.prototype;a.createObjectFn_=null;a.disposeObjectFn_=null;a.setCreateObjectFn=function(b){this.createObjectFn_=b};a.setDisposeObjectFn=function(b){this.disposeObjectFn_=b};a.getObject=function(){if(this.freeQueue_.length)return this.freeQueue_.pop();return this.createObject()};
a.releaseObject=function(b){this.freeQueue_.length<this.maxCount_?this.freeQueue_.push(b):this.disposeObject(b)};a.createInitial_=function(b){if(b>this.maxCount_)throw Error("[goog.structs.SimplePool] Initial cannot be greater than max");for(var c=0;c<b;c++)this.freeQueue_.push(this.createObject())};a.createObject=function(){return this.createObjectFn_?this.createObjectFn_():{}};
a.disposeObject=function(b){if(this.disposeObjectFn_)this.disposeObjectFn_(b);else if(goog.isObject(b))if(goog.isFunction(b.dispose))b.dispose();else for(var c in b)delete b[c]};a.disposeInternal=function(){goog.structs.SimplePool.superClass_.disposeInternal.call(this);for(var b=this.freeQueue_;b.length;)this.disposeObject(b.pop());delete this.freeQueue_};goog.userAgent.jscript={};goog.userAgent.jscript.ASSUME_NO_JSCRIPT=false;goog.userAgent.jscript.init_=function(){var b="ScriptEngine"in goog.global;goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_=b&&goog.global.ScriptEngine()=="JScript";goog.userAgent.jscript.DETECTED_VERSION_=goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_?goog.global.ScriptEngineMajorVersion()+"."+goog.global.ScriptEngineMinorVersion()+"."+goog.global.ScriptEngineBuildVersion():"0"};goog.userAgent.jscript.ASSUME_NO_JSCRIPT||goog.userAgent.jscript.init_();
goog.userAgent.jscript.HAS_JSCRIPT=goog.userAgent.jscript.ASSUME_NO_JSCRIPT?false:goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_;goog.userAgent.jscript.VERSION=goog.userAgent.jscript.ASSUME_NO_JSCRIPT?"0":goog.userAgent.jscript.DETECTED_VERSION_;goog.userAgent.jscript.isVersion=function(b){return goog.string.compareVersions(goog.userAgent.jscript.VERSION,b)>=0};goog.events.pools={};
(function(){function b(){return{count_:0,remaining_:0}}function c(){return[]}function d(){function m(p){return h.call(m.src,m.key,p)}return m}function e(){return new goog.events.Listener}function f(){return new goog.events.BrowserEvent}var g=goog.userAgent.jscript.HAS_JSCRIPT&&!goog.userAgent.jscript.isVersion("5.7"),h;goog.events.pools.setProxyCallbackFunction=function(m){h=m};if(g){goog.events.pools.getObject=function(){return j.getObject()};goog.events.pools.releaseObject=function(m){j.releaseObject(m)};
goog.events.pools.getArray=function(){return k.getObject()};goog.events.pools.releaseArray=function(m){k.releaseObject(m)};goog.events.pools.getProxy=function(){return l.getObject()};goog.events.pools.releaseProxy=function(){l.releaseObject(d())};goog.events.pools.getListener=function(){return n.getObject()};goog.events.pools.releaseListener=function(m){n.releaseObject(m)};goog.events.pools.getEvent=function(){return o.getObject()};goog.events.pools.releaseEvent=function(m){o.releaseObject(m)};g=
0;var i=600,j=new goog.structs.SimplePool(g,i);j.setCreateObjectFn(b);g=0;i=600;var k=new goog.structs.SimplePool(g,i);k.setCreateObjectFn(c);g=0;i=600;var l=new goog.structs.SimplePool(g,i);l.setCreateObjectFn(d);g=0;i=600;var n=new goog.structs.SimplePool(g,i);n.setCreateObjectFn(e);g=0;i=600;var o=new goog.structs.SimplePool(g,i);o.setCreateObjectFn(f)}else{goog.events.pools.getObject=b;goog.events.pools.releaseObject=goog.nullFunction;goog.events.pools.getArray=c;goog.events.pools.releaseArray=
goog.nullFunction;goog.events.pools.getProxy=d;goog.events.pools.releaseProxy=goog.nullFunction;goog.events.pools.getListener=e;goog.events.pools.releaseListener=goog.nullFunction;goog.events.pools.getEvent=f;goog.events.pools.releaseEvent=goog.nullFunction}})();goog.events.listeners_={};goog.events.listenerTree_={};goog.events.sources_={};goog.events.onString_="on";goog.events.onStringMap_={};goog.events.keySeparator_="_";
goog.events.listen=function(b,c,d,e,f){if(c)if(goog.isArray(c)){for(var g=0;g<c.length;g++)goog.events.listen(b,c[g],d,e,f);return null}else{e=!!e;var h=goog.events.listenerTree_;c in h||(h[c]=goog.events.pools.getObject());h=h[c];if(!(e in h)){h[e]=goog.events.pools.getObject();h.count_++}h=h[e];var i=goog.getUid(b),j;h.remaining_++;if(h[i]){j=h[i];for(g=0;g<j.length;g++){h=j[g];if(h.listener==d&&h.handler==f){if(h.removed)break;return j[g].key}}}else{j=h[i]=goog.events.pools.getArray();h.count_++}g=
goog.events.pools.getProxy();g.src=b;h=goog.events.pools.getListener();h.init(d,g,b,c,e,f);d=h.key;g.key=d;j.push(h);goog.events.listeners_[d]=h;goog.events.sources_[i]||(goog.events.sources_[i]=goog.events.pools.getArray());goog.events.sources_[i].push(h);if(b.addEventListener){if(b==goog.global||!b.customEvent_)b.addEventListener(c,g,e)}else b.attachEvent(goog.events.getOnString_(c),g);return d}else throw Error("Invalid event type");};
goog.events.listenOnce=function(b,c,d,e,f){if(goog.isArray(c)){for(var g=0;g<c.length;g++)goog.events.listenOnce(b,c[g],d,e,f);return null}b=goog.events.listen(b,c,d,e,f);c=goog.events.listeners_[b];c.callOnce=true;return b};goog.events.listenWithWrapper=function(b,c,d,e,f){c.listen(b,d,e,f)};
goog.events.unlisten=function(b,c,d,e,f){if(goog.isArray(c)){for(var g=0;g<c.length;g++)goog.events.unlisten(b,c[g],d,e,f);return null}e=!!e;b=goog.events.getListeners_(b,c,e);if(!b)return false;for(g=0;g<b.length;g++)if(b[g].listener==d&&b[g].capture==e&&b[g].handler==f)return goog.events.unlistenByKey(b[g].key);return false};
goog.events.unlistenByKey=function(b){if(!goog.events.listeners_[b])return false;var c=goog.events.listeners_[b];if(c.removed)return false;var d=c.src,e=c.type,f=c.proxy,g=c.capture;if(d.removeEventListener){if(d==goog.global||!d.customEvent_)d.removeEventListener(e,f,g)}else d.detachEvent&&d.detachEvent(goog.events.getOnString_(e),f);d=goog.getUid(d);f=goog.events.listenerTree_[e][g][d];if(goog.events.sources_[d]){var h=goog.events.sources_[d];goog.array.remove(h,c);h.length==0&&delete goog.events.sources_[d]}c.removed=
true;f.needsCleanup_=true;goog.events.cleanUp_(e,g,d,f);delete goog.events.listeners_[b];return true};goog.events.unlistenWithWrapper=function(b,c,d,e,f){c.unlisten(b,d,e,f)};
goog.events.cleanUp_=function(b,c,d,e){if(!e.locked_)if(e.needsCleanup_){for(var f=0,g=0;f<e.length;f++)if(e[f].removed){var h=e[f].proxy;h.src=null;goog.events.pools.releaseProxy(h);goog.events.pools.releaseListener(e[f])}else{if(f!=g)e[g]=e[f];g++}e.length=g;e.needsCleanup_=false;if(g==0){goog.events.pools.releaseArray(e);delete goog.events.listenerTree_[b][c][d];goog.events.listenerTree_[b][c].count_--;if(goog.events.listenerTree_[b][c].count_==0){goog.events.pools.releaseObject(goog.events.listenerTree_[b][c]);
delete goog.events.listenerTree_[b][c];goog.events.listenerTree_[b].count_--}if(goog.events.listenerTree_[b].count_==0){goog.events.pools.releaseObject(goog.events.listenerTree_[b]);delete goog.events.listenerTree_[b]}}}};
goog.events.removeAll=function(b,c,d){var e=0,f=b==null,g=c==null,h=d==null;d=!!d;if(f)goog.object.forEach(goog.events.sources_,function(j){for(var k=j.length-1;k>=0;k--){var l=j[k];if((g||c==l.type)&&(h||d==l.capture)){goog.events.unlistenByKey(l.key);e++}}});else{b=goog.getUid(b);if(goog.events.sources_[b]){b=goog.events.sources_[b];for(f=b.length-1;f>=0;f--){var i=b[f];if((g||c==i.type)&&(h||d==i.capture)){goog.events.unlistenByKey(i.key);e++}}}}return e};
goog.events.getListeners=function(b,c,d){return goog.events.getListeners_(b,c,d)||[]};goog.events.getListeners_=function(b,c,d){var e=goog.events.listenerTree_;if(c in e){e=e[c];if(d in e){e=e[d];b=goog.getUid(b);if(e[b])return e[b]}}return null};goog.events.getListener=function(b,c,d,e,f){e=!!e;if(b=goog.events.getListeners_(b,c,e))for(c=0;c<b.length;c++)if(b[c].listener==d&&b[c].capture==e&&b[c].handler==f)return b[c];return null};
goog.events.hasListener=function(b,c,d){b=goog.getUid(b);var e=goog.events.sources_[b];if(e){var f=goog.isDef(c),g=goog.isDef(d);if(f&&g){e=goog.events.listenerTree_[c];return!!e&&!!e[d]&&b in e[d]}else return f||g?goog.array.some(e,function(h){return f&&h.type==c||g&&h.capture==d}):true}return false};goog.events.expose=function(b){var c=[];for(var d in b)b[d]&&b[d].id?c.push(d+" = "+b[d]+" ("+b[d].id+")"):c.push(d+" = "+b[d]);return c.join("\n")};
goog.events.EventType={CLICK:"click",DBLCLICK:"dblclick",MOUSEDOWN:"mousedown",MOUSEUP:"mouseup",MOUSEOVER:"mouseover",MOUSEOUT:"mouseout",MOUSEMOVE:"mousemove",SELECTSTART:"selectstart",KEYPRESS:"keypress",KEYDOWN:"keydown",KEYUP:"keyup",BLUR:"blur",FOCUS:"focus",DEACTIVATE:"deactivate",FOCUSIN:goog.userAgent.IE?"focusin":"DOMFocusIn",FOCUSOUT:goog.userAgent.IE?"focusout":"DOMFocusOut",CHANGE:"change",SELECT:"select",SUBMIT:"submit",INPUT:"input",PROPERTYCHANGE:"propertychange",DRAGSTART:"dragstart",
DRAGENTER:"dragenter",DRAGOVER:"dragover",DRAGLEAVE:"dragleave",DROP:"drop",CONTEXTMENU:"contextmenu",ERROR:"error",HELP:"help",LOAD:"load",LOSECAPTURE:"losecapture",READYSTATECHANGE:"readystatechange",RESIZE:"resize",SCROLL:"scroll",UNLOAD:"unload",HASHCHANGE:"hashchange",POPSTATE:"popstate"};goog.events.getOnString_=function(b){if(b in goog.events.onStringMap_)return goog.events.onStringMap_[b];return goog.events.onStringMap_[b]=goog.events.onString_+b};
goog.events.fireListeners=function(b,c,d,e){var f=goog.events.listenerTree_;if(c in f){f=f[c];if(d in f)return goog.events.fireListeners_(f[d],b,c,d,e)}return true};goog.events.fireListeners_=function(b,c,d,e,f){var g=1;c=goog.getUid(c);if(b[c]){b.remaining_--;b=b[c];if(b.locked_)b.locked_++;else b.locked_=1;try{for(var h=b.length,i=0;i<h;i++){var j=b[i];if(j&&!j.removed)g&=goog.events.fireListener(j,f)!==false}}finally{b.locked_--;goog.events.cleanUp_(d,e,c,b)}}return Boolean(g)};
goog.events.fireListener=function(b,c){c=b.handleEvent(c);b.callOnce&&goog.events.unlistenByKey(b.key);return c};goog.events.getTotalListenerCount=function(){return goog.object.getCount(goog.events.listeners_)};
goog.events.dispatchEvent=function(b,c){if(goog.isString(c))c=new goog.events.Event(c,b);else if(c instanceof goog.events.Event)c.target=c.target||b;else{var d=c;c=new goog.events.Event(c.type,b);goog.object.extend(c,d)}d=1;var e,f=c.type,g=goog.events.listenerTree_;if(!(f in g))return true;g=g[f];f=true in g;var h;if(f){e=[];for(h=b;h;h=h.getParentEventTarget())e.push(h);h=g[true];h.remaining_=h.count_;for(var i=e.length-1;!c.propagationStopped_&&i>=0&&h.remaining_;i--){c.currentTarget=e[i];d&=goog.events.fireListeners_(h,
e[i],c.type,true,c)&&c.returnValue_!=false}}if(h=false in g){h=g[false];h.remaining_=h.count_;if(f)for(i=0;!c.propagationStopped_&&i<e.length&&h.remaining_;i++){c.currentTarget=e[i];d&=goog.events.fireListeners_(h,e[i],c.type,false,c)&&c.returnValue_!=false}else for(b=b;!c.propagationStopped_&&b&&h.remaining_;b=b.getParentEventTarget()){c.currentTarget=b;d&=goog.events.fireListeners_(h,b,c.type,false,c)&&c.returnValue_!=false}}return Boolean(d)};
goog.events.protectBrowserEventEntryPoint=function(b){goog.events.handleBrowserEvent_=b.protectEntryPoint(goog.events.handleBrowserEvent_);goog.events.pools.setProxyCallbackFunction(goog.events.handleBrowserEvent_)};
goog.events.handleBrowserEvent_=function(b,c){if(!goog.events.listeners_[b])return true;b=goog.events.listeners_[b];var d=b.type,e=goog.events.listenerTree_;if(!(d in e))return true;e=e[d];var f,g;if(goog.events.synthesizeEventPropagation_()){f=c||goog.getObjectByName("window.event");c=true in e;var h=false in e;if(c){if(goog.events.isMarkedIeEvent_(f))return true;goog.events.markIeEvent_(f)}var i=goog.events.pools.getEvent();i.init(f,this);f=true;try{if(c){for(var j=goog.events.pools.getArray(),
k=i.currentTarget;k;k=k.parentNode)j.push(k);g=e[true];g.remaining_=g.count_;for(var l=j.length-1;!i.propagationStopped_&&l>=0&&g.remaining_;l--){i.currentTarget=j[l];f&=goog.events.fireListeners_(g,j[l],d,true,i)}if(h){g=e[false];g.remaining_=g.count_;for(l=0;!i.propagationStopped_&&l<j.length&&g.remaining_;l++){i.currentTarget=j[l];f&=goog.events.fireListeners_(g,j[l],d,false,i)}}}else f=goog.events.fireListener(b,i)}finally{if(j){j.length=0;goog.events.pools.releaseArray(j)}i.dispose();goog.events.pools.releaseEvent(i)}return f}g=
new goog.events.BrowserEvent(c,this);try{f=goog.events.fireListener(b,g)}finally{g.dispose()}return f};goog.events.pools.setProxyCallbackFunction(goog.events.handleBrowserEvent_);goog.events.markIeEvent_=function(b){var c=false;if(b.keyCode==0)try{b.keyCode=-1;return}catch(d){c=true}if(c||b.returnValue==undefined)b.returnValue=true};goog.events.isMarkedIeEvent_=function(b){return b.keyCode<0||b.returnValue!=undefined};goog.events.uniqueIdCounter_=0;
goog.events.getUniqueId=function(b){return b+"_"+goog.events.uniqueIdCounter_++};goog.events.synthesizeEventPropagation_=function(){if(goog.events.requiresSyntheticEventPropagation_===undefined)goog.events.requiresSyntheticEventPropagation_=goog.userAgent.IE&&!goog.global.addEventListener;return goog.events.requiresSyntheticEventPropagation_};goog.debug.entryPointRegistry.register(function(b){goog.events.handleBrowserEvent_=b(goog.events.handleBrowserEvent_);goog.events.pools.setProxyCallbackFunction(goog.events.handleBrowserEvent_)});goog.events.EventHandler=function(b){this.handler_=b};goog.inherits(goog.events.EventHandler,goog.Disposable);goog.events.EventHandler.KEY_POOL_INITIAL_COUNT=0;goog.events.EventHandler.KEY_POOL_MAX_COUNT=100;goog.events.EventHandler.keyPool_=new goog.structs.SimplePool(goog.events.EventHandler.KEY_POOL_INITIAL_COUNT,goog.events.EventHandler.KEY_POOL_MAX_COUNT);goog.events.EventHandler.keys_=null;goog.events.EventHandler.key_=null;a=goog.events.EventHandler.prototype;
a.listen=function(b,c,d,e,f){if(goog.isArray(c))for(var g=0;g<c.length;g++)this.listen(b,c[g],d,e,f);else{b=goog.events.listen(b,c,d||this,e||false,f||this.handler_||this);this.recordListenerKey_(b)}return this};a.listenOnce=function(b,c,d,e,f){if(goog.isArray(c))for(var g=0;g<c.length;g++)this.listenOnce(b,c[g],d,e,f);else{b=goog.events.listenOnce(b,c,d||this,e||false,f||this.handler_||this);this.recordListenerKey_(b)}return this};
a.listenWithWrapper=function(b,c,d,e,f){c.listen(b,d,e,f||this.handler_,this);return this};a.recordListenerKey_=function(b){if(this.keys_)this.keys_[b]=true;else if(this.key_){this.keys_=goog.events.EventHandler.keyPool_.getObject();this.keys_[this.key_]=true;this.key_=null;this.keys_[b]=true}else this.key_=b};
a.unlisten=function(b,c,d,e,f){if(this.key_||this.keys_)if(goog.isArray(c))for(var g=0;g<c.length;g++)this.unlisten(b,c[g],d,e,f);else if(b=goog.events.getListener(b,c,d||this,e||false,f||this.handler_||this)){b=b.key;goog.events.unlistenByKey(b);if(this.keys_)goog.object.remove(this.keys_,b);else if(this.key_==b)this.key_=null}return this};a.unlistenWithWrapper=function(b,c,d,e,f){c.unlisten(b,d,e,f||this.handler_,this);return this};
a.removeAll=function(){if(this.keys_){for(var b in this.keys_){goog.events.unlistenByKey(b);delete this.keys_[b]}goog.events.EventHandler.keyPool_.releaseObject(this.keys_);this.keys_=null}else this.key_&&goog.events.unlistenByKey(this.key_)};a.disposeInternal=function(){goog.events.EventHandler.superClass_.disposeInternal.call(this);this.removeAll()};a.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented");};goog.events.EventTarget=function(){goog.Disposable.call(this)};goog.inherits(goog.events.EventTarget,goog.Disposable);a=goog.events.EventTarget.prototype;a.customEvent_=true;a.parentEventTarget_=null;a.getParentEventTarget=function(){return this.parentEventTarget_};a.setParentEventTarget=function(b){this.parentEventTarget_=b};a.addEventListener=function(b,c,d,e){goog.events.listen(this,b,c,d,e)};a.removeEventListener=function(b,c,d,e){goog.events.unlisten(this,b,c,d,e)};
a.dispatchEvent=function(b){return goog.events.dispatchEvent(this,b)};a.disposeInternal=function(){goog.events.EventTarget.superClass_.disposeInternal.call(this);goog.events.removeAll(this);this.parentEventTarget_=null};goog.fx={};goog.fx.Dragger=function(b,c,d){this.target=b;this.handle=c||b;this.limits=d||new goog.math.Rect(NaN,NaN,NaN,NaN);this.document_=goog.dom.getOwnerDocument(b);this.eventHandler_=new goog.events.EventHandler(this);goog.events.listen(this.handle,goog.events.EventType.MOUSEDOWN,this.startDrag,false,this)};goog.inherits(goog.fx.Dragger,goog.events.EventTarget);goog.fx.Dragger.HAS_SET_CAPTURE_=goog.userAgent.IE||goog.userAgent.GECKO&&goog.userAgent.isVersion("1.9.3");
goog.fx.Dragger.EventType={START:"start",BEFOREDRAG:"beforedrag",DRAG:"drag",END:"end"};a=goog.fx.Dragger.prototype;a.screenX=0;a.screenY=0;a.startX=0;a.startY=0;a.deltaX=0;a.deltaY=0;a.enabled_=true;a.dragging_=false;a.hysteresisDistanceSquared_=0;a.mouseDownTime_=0;a.ieDragStartCancellingOn_=false;a.getHandler=function(){return this.eventHandler_};a.setLimits=function(b){this.limits=b||new goog.math.Rect(NaN,NaN,NaN,NaN)};a.setHysteresis=function(b){this.hysteresisDistanceSquared_=Math.pow(b,2)};
a.getHysteresis=function(){return Math.sqrt(this.hysteresisDistanceSquared_)};a.setScrollTarget=function(b){this.scrollTarget_=b};a.setCancelIeDragStart=function(b){this.ieDragStartCancellingOn_=b};a.getEnabled=function(){return this.enabled_};a.setEnabled=function(b){this.enabled_=b};
a.disposeInternal=function(){goog.fx.Dragger.superClass_.disposeInternal.call(this);goog.events.unlisten(this.handle,goog.events.EventType.MOUSEDOWN,this.startDrag,false,this);this.eventHandler_.dispose();delete this.target;delete this.handle;delete this.eventHandler_};
a.startDrag=function(b){if(this.enabled_&&!this.dragging_&&(b.type!=goog.events.EventType.MOUSEDOWN||b.isButton(goog.events.BrowserEvent.MouseButton.LEFT))){if(this.hysteresisDistanceSquared_==0){this.initializeDrag_(b);if(this.dragging_)b.preventDefault();else return}else b.preventDefault();this.setupDragHandlers();this.screenX=this.startX=b.screenX;this.screenY=this.startY=b.screenY;this.deltaX=this.target.offsetLeft;this.deltaY=this.target.offsetTop;this.pageScroll=goog.dom.getDomHelper(this.document_).getDocumentScroll();
this.mouseDownTime_=goog.now()}};
a.setupDragHandlers=function(){var b=this.document_,c=b.documentElement,d=!goog.fx.Dragger.HAS_SET_CAPTURE_;this.eventHandler_.listen(b,goog.events.EventType.MOUSEMOVE,this.mouseMoved_,d);this.eventHandler_.listen(b,goog.events.EventType.MOUSEUP,this.endDrag,d);if(goog.fx.Dragger.HAS_SET_CAPTURE_){c.setCapture(false);this.eventHandler_.listen(c,goog.events.EventType.LOSECAPTURE,this.endDrag)}else this.eventHandler_.listen(goog.dom.getWindow(b),goog.events.EventType.BLUR,this.endDrag);goog.userAgent.IE&&
this.ieDragStartCancellingOn_&&this.eventHandler_.listen(b,goog.events.EventType.DRAGSTART,goog.events.Event.preventDefault);this.scrollTarget_&&this.eventHandler_.listen(this.scrollTarget_,goog.events.EventType.SCROLL,this.onScroll_,d)};a.initializeDrag_=function(b){b=this.dispatchEvent(new goog.fx.DragEvent(goog.fx.Dragger.EventType.START,this,b.clientX,b.clientY,b));if(b!==false)this.dragging_=true};
a.endDrag=function(b,c){this.eventHandler_.removeAll();goog.fx.Dragger.HAS_SET_CAPTURE_&&this.document_.releaseCapture();if(this.dragging_){this.dragging_=false;var d=this.limitX(this.deltaX),e=this.limitY(this.deltaY);this.dispatchEvent(new goog.fx.DragEvent(goog.fx.Dragger.EventType.END,this,b.clientX,b.clientY,b,d,e,c))}};a.endDragCancel=function(b){this.endDrag(b,true)};
a.mouseMoved_=function(b){if(this.enabled_){var c=b.screenX-this.screenX,d=b.screenY-this.screenY;this.screenX=b.screenX;this.screenY=b.screenY;if(!this.dragging_){var e=this.startX-this.screenX,f=this.startY-this.screenY;e=e*e+f*f;if(e>this.hysteresisDistanceSquared_){this.initializeDrag_(b);if(!this.dragging_){this.endDrag(b);return}}}d=this.calculatePosition_(c,d);c=d.x;d=d.y;if(this.dragging_){e=this.dispatchEvent(new goog.fx.DragEvent(goog.fx.Dragger.EventType.BEFOREDRAG,this,b.clientX,b.clientY,
b,c,d));if(e!==false){this.doDrag(b,c,d,false);b.preventDefault()}}}};a.calculatePosition_=function(b,c){var d=goog.dom.getDomHelper(this.document_).getDocumentScroll();b+=d.x-this.pageScroll.x;c+=d.y-this.pageScroll.y;this.pageScroll=d;this.deltaX+=b;this.deltaY+=c;b=this.limitX(this.deltaX);c=this.limitY(this.deltaY);return new goog.math.Coordinate(b,c)};
a.onScroll_=function(b){var c=this.calculatePosition_(0,0);b.clientX=this.pageScroll.x-this.screenX;b.clientY=this.pageScroll.x-this.screenY;this.doDrag(b,c.x,c.y,true)};a.doDrag=function(b,c,d){this.defaultAction(c,d);this.dispatchEvent(new goog.fx.DragEvent(goog.fx.Dragger.EventType.DRAG,this,b.clientX,b.clientY,b,c,d))};a.limitX=function(b){var c=this.limits,d=!isNaN(c.left)?c.left:null;c=!isNaN(c.width)?c.width:0;c=d!=null?d+c:Infinity;d=d!=null?d:-Infinity;return Math.min(c,Math.max(d,b))};
a.limitY=function(b){var c=this.limits,d=!isNaN(c.top)?c.top:null;c=!isNaN(c.height)?c.height:0;c=d!=null?d+c:Infinity;d=d!=null?d:-Infinity;return Math.min(c,Math.max(d,b))};a.defaultAction=function(b,c){this.target.style.left=b+"px";this.target.style.top=c+"px"};goog.fx.DragEvent=function(b,c,d,e,f,g,h,i){goog.events.Event.call(this,b);this.clientX=d;this.clientY=e;this.browserEvent=f;this.left=goog.isDef(g)?g:c.deltaX;this.top=goog.isDef(h)?h:c.deltaY;this.dragger=c;this.dragCanceled=!!i};
goog.inherits(goog.fx.DragEvent,goog.events.Event);goog.fx.DragListGroup=function(){goog.events.EventTarget.call(this);this.dragLists_=[];this.dragItems_=[];this.dragItemForHandle_={};this.eventHandler_=new goog.events.EventHandler(this);this.isCurrDragItemAlwaysDisplayed_=this.isInitialized_=false};goog.inherits(goog.fx.DragListGroup,goog.events.EventTarget);goog.fx.DragListDirection={DOWN:0,UP:1,RIGHT:2,LEFT:3};
goog.fx.DragListGroup.EventType={BEFOREDRAGSTART:"beforedragstart",DRAGSTART:"dragstart",BEFOREDRAGMOVE:"beforedragmove",DRAGMOVE:"dragmove",BEFOREDRAGEND:"beforedragend",DRAGEND:"dragend"};a=goog.fx.DragListGroup.prototype;a.setIsCurrDragItemAlwaysDisplayed=function(){this.isCurrDragItemAlwaysDisplayed_=true};a.addDragList=function(b,c,d,e){this.assertNotInitialized_();b.dlgGrowthDirection_=c;b.dlgIsDocOrderSameAsGrowthDirection_=d!==false;b.dlgDragHoverClass_=e;this.dragLists_.push(b)};
a.setFunctionToGetHandleForDragItem=function(b){this.assertNotInitialized_();this.getHandleForDragItem_=b};a.setDragItemHoverClass=function(b){this.assertNotInitialized_();this.dragItemHoverClass_=b};a.setDragItemHandleHoverClass=function(b){this.assertNotInitialized_();this.dragItemHandleHoverClass_=b};a.setCurrDragItemClass=function(b){this.assertNotInitialized_();this.currDragItemClass_=b};a.setDraggerElClass=function(b){this.assertNotInitialized_();this.draggerElClass_=b};
a.init=function(){if(!this.isInitialized_){for(var b=0,c=this.dragLists_.length;b<c;b++){var d=this.dragLists_[b];d=this.getItemsInDragList_(d);for(var e=0,f=d.length;e<f;++e){var g=d[e],h=this.getHandleForDragItem_(g),i=goog.getUid(h);this.dragItemForHandle_[i]=g;if(this.dragItemHoverClass_){this.eventHandler_.listen(g,goog.events.EventType.MOUSEOVER,this.handleDragItemMouseover_);this.eventHandler_.listen(g,goog.events.EventType.MOUSEOUT,this.handleDragItemMouseout_)}if(this.dragItemHandleHoverClass_){this.eventHandler_.listen(h,
goog.events.EventType.MOUSEOVER,this.handleDragItemHandleMouseover_);this.eventHandler_.listen(h,goog.events.EventType.MOUSEOUT,this.handleDragItemHandleMouseout_)}this.dragItems_.push(g);this.eventHandler_.listen(h,goog.events.EventType.MOUSEDOWN,this.handleDragStart_)}}this.isInitialized_=true}};
a.disposeInternal=function(){this.eventHandler_.dispose();for(var b=0,c=this.dragLists_.length;b<c;b++){var d=this.dragLists_[b];d.dlgGrowthDirection_=undefined;d.dlgIsDocOrderSameAsGrowthDirection_=undefined;d.dlgDragHoverClass_=undefined}this.dragLists_.length=0;this.dragItems_.length=0;this.dragItemForHandle_=null;goog.fx.DragListGroup.superClass_.disposeInternal.call(this)};
a.handleDragStart_=function(b){var c=goog.getUid(b.currentTarget);c=this.dragItemForHandle_[c];var d=this.dispatchEvent(new goog.fx.DragListGroupEvent(goog.fx.DragListGroup.EventType.BEFOREDRAGSTART,this,b,c,null,null));if(!d)return false;this.currDragItem_=c;this.origList_=c.parentNode;this.origNextItem_=goog.dom.getNextElementSibling(c);this.draggerEl_=d=this.cloneNode_(c);if(this.currDragItemClass_)goog.dom.classes.add(c,this.currDragItemClass_);else c.style.visibility="hidden";this.draggerElClass_&&
goog.dom.classes.add(d,this.draggerElClass_);d.style.margin="0px";d.style.position="absolute";goog.dom.getOwnerDocument(c).body.appendChild(d);var e=goog.style.getPageOffset(c);goog.style.setPageOffset(d,e);e=goog.style.getSize(d);d.halfWidth=e.width/2;d.halfHeight=e.height/2;c.style.display="none";e=0;for(var f=this.dragLists_.length;e<f;e++){var g=this.dragLists_[e];g.dlgBounds_=goog.style.getBounds(g)}e=0;for(f=this.dragItems_.length;e<f;e++){g=this.dragItems_[e];if(g!=c)g.dlgBounds_=goog.style.getBounds(g)}c.style.display=
"";this.dragger_=new goog.fx.Dragger(d);this.eventHandler_.listen(this.dragger_,goog.fx.Dragger.EventType.DRAG,this.handleDragMove_);this.eventHandler_.listen(this.dragger_,goog.fx.Dragger.EventType.END,this.handleDragEnd_);this.dragger_.startDrag(b);this.dispatchEvent(new goog.fx.DragListGroupEvent(goog.fx.DragListGroup.EventType.DRAGSTART,this,b,c,d,this.dragger_));return true};
a.handleDragMove_=function(b){var c=goog.style.getPageOffset(this.draggerEl_);c=new goog.math.Coordinate(c.x+this.draggerEl_.halfWidth,c.y+this.draggerEl_.halfHeight);var d=this.getHoverDragList_(c),e=d?this.getHoverNextItem_(d,c):null,f=this.dispatchEvent(new goog.fx.DragListGroupEvent(goog.fx.DragListGroup.EventType.BEFOREDRAGMOVE,this,b,this.currDragItem_,this.draggerEl_,this.dragger_,c,d,e));if(!f)return false;if(d){this.insertCurrDragItem_(d,e);this.currDragItem_.style.display="";d.dlgDragHoverClass_&&
goog.dom.classes.add(d,d.dlgDragHoverClass_)}else{if(!this.isCurrDragItemAlwaysDisplayed_)this.currDragItem_.style.display="none";f=0;for(var g=this.dragLists_.length;f<g;f++){var h=this.dragLists_[f];h.dlgDragHoverClass_&&goog.dom.classes.remove(h,h.dlgDragHoverClass_)}}this.dispatchEvent(new goog.fx.DragListGroupEvent(goog.fx.DragListGroup.EventType.DRAGMOVE,this,b,this.currDragItem_,this.draggerEl_,this.dragger_,c,d,e));return false};
a.handleDragEnd_=function(b){var c=this.dispatchEvent(new goog.fx.DragListGroupEvent(goog.fx.DragListGroup.EventType.BEFOREDRAGEND,this,b,this.currDragItem_,this.draggerEl_,this.dragger_));if(!c)return false;this.dragger_.dispose();goog.dom.removeNode(this.draggerEl_);if(this.currDragItem_.style.display=="none"){this.origList_.insertBefore(this.currDragItem_,this.origNextItem_);this.currDragItem_.style.display=""}if(this.currDragItemClass_)goog.dom.classes.remove(this.currDragItem_,this.currDragItemClass_);
else this.currDragItem_.style.visibility="visible";c=0;for(var d=this.dragLists_.length;c<d;c++){var e=this.dragLists_[c];e.dlgDragHoverClass_&&goog.dom.classes.remove(e,e.dlgDragHoverClass_)}this.dispatchEvent(new goog.fx.DragListGroupEvent(goog.fx.DragListGroup.EventType.DRAGEND,this,b,this.currDragItem_,this.draggerEl_,this.dragger_));this.dragger_=this.draggerEl_=this.origNextItem_=this.origList_=this.currDragItem_=null;c=0;for(d=this.dragLists_.length;c<d;c++)this.dragLists_[c].dlgBounds_=null;
c=0;for(d=this.dragItems_.length;c<d;c++)this.dragItems_[c].dlgBounds_=null;return true};a.assertNotInitialized_=function(){if(this.isInitialized_)throw Error("This action is not allowed after calling init().");};a.getHandleForDragItem_=function(b){return b};a.handleDragItemMouseover_=function(b){goog.dom.classes.add(b.currentTarget,this.dragItemHoverClass_)};a.handleDragItemMouseout_=function(b){goog.dom.classes.remove(b.currentTarget,this.dragItemHoverClass_)};
a.handleDragItemHandleMouseover_=function(b){goog.dom.classes.add(b.currentTarget,this.dragItemHandleHoverClass_)};a.handleDragItemHandleMouseout_=function(b){goog.dom.classes.remove(b.currentTarget,this.dragItemHandleHoverClass_)};a.getItemsInDragList_=function(b){var c=[];b=b.childNodes;for(var d=0,e=b.length;d<e;d++)b[d].nodeType==goog.dom.NodeType.ELEMENT&&c.push(b[d]);return c};
a.getHoverDragList_=function(b){var c=null;if(this.currDragItem_.style.display!="none"){c=this.currDragItem_.parentNode;var d=goog.style.getBounds(c);if(this.isInRect_(b,d))return c}d=0;for(var e=this.dragLists_.length;d<e;d++){var f=this.dragLists_[d];if(f!=c)if(this.isInRect_(b,f.dlgBounds_))return f}return null};a.isInRect_=function(b,c){return b.x>c.left&&b.x<c.left+c.width&&b.y>c.top&&b.y<c.top+c.height};
a.getHoverNextItem_=function(b,c){if(b==null)throw Error("getHoverNextItem_ called with null hoverList.");var d,e,f;switch(b.dlgGrowthDirection_){case goog.fx.DragListDirection.DOWN:d=c.y;e=goog.fx.DragListGroup.getBottomBound_;f=goog.fx.DragListGroup.isLessThan_;break;case goog.fx.DragListDirection.UP:d=c.y;e=goog.fx.DragListGroup.getTopBound_;f=goog.fx.DragListGroup.isGreaterThan_;break;case goog.fx.DragListDirection.RIGHT:d=c.x;e=goog.fx.DragListGroup.getRightBound_;f=goog.fx.DragListGroup.isLessThan_;
break;case goog.fx.DragListDirection.LEFT:d=c.x;e=goog.fx.DragListGroup.getLeftBound_;f=goog.fx.DragListGroup.isGreaterThan_;break}c=null;var g;b=this.getItemsInDragList_(b);for(var h=0,i=b.length;h<i;h++){var j=b[h];if(j!=this.currDragItem_){var k=e(j.dlgBounds_);if(f(d,k)&&(g==undefined||f(k,g))){c=j;g=k}}}return c};goog.fx.DragListGroup.getBottomBound_=function(b){return b.top+b.height-1};goog.fx.DragListGroup.getTopBound_=function(b){return b.top||0};
goog.fx.DragListGroup.getRightBound_=function(b){return b.left+b.width-1};goog.fx.DragListGroup.getLeftBound_=function(b){return b.left||0};goog.fx.DragListGroup.isLessThan_=function(b,c){return b<c};goog.fx.DragListGroup.isGreaterThan_=function(b,c){return b>c};
goog.fx.DragListGroup.prototype.insertCurrDragItem_=function(b,c){if(b.dlgIsDocOrderSameAsGrowthDirection_){if(this.currDragItem_.parentNode!=b||goog.dom.getNextElementSibling(this.currDragItem_)!=c)b.insertBefore(this.currDragItem_,c)}else if(c){c=goog.dom.getNextElementSibling(c);b.insertBefore(this.currDragItem_,c)}else b.insertBefore(this.currDragItem_,goog.dom.getFirstElementChild(b))};
goog.fx.DragListGroup.prototype.cloneNode_=function(b){var c=b.cloneNode(true);switch(b.tagName.toLowerCase()){case "tr":return goog.dom.createDom("table",null,goog.dom.createDom("tbody",null,c));case "td":case "th":return goog.dom.createDom("table",null,goog.dom.createDom("tbody",null,goog.dom.createDom("tr",null,c)));default:return c}};
goog.fx.DragListGroupEvent=function(b,c,d,e,f,g,h,i,j){this.type=b;this.dragListGroup=c;this.event=d;this.currDragItem=e;this.draggerEl=f;this.dragger=g;this.draggerElCenter=h;this.hoverList=i;this.hoverNextItem=j};goog.Timer=function(b,c){goog.events.EventTarget.call(this);this.interval_=b||1;this.timerObject_=c||goog.Timer.defaultTimerObject;this.boundTick_=goog.bind(this.tick_,this);this.last_=goog.now()};goog.inherits(goog.Timer,goog.events.EventTarget);goog.Timer.MAX_TIMEOUT_=2147483647;goog.Timer.prototype.enabled=false;goog.Timer.defaultTimerObject=goog.global.window;goog.Timer.intervalScale=0.8;a=goog.Timer.prototype;a.timer_=null;a.getInterval=function(){return this.interval_};
a.setInterval=function(b){this.interval_=b;if(this.timer_&&this.enabled){this.stop();this.start()}else this.timer_&&this.stop()};a.tick_=function(){if(this.enabled){var b=goog.now()-this.last_;if(b>0&&b<this.interval_*goog.Timer.intervalScale)this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_-b);else{this.dispatchTick();if(this.enabled){this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_);this.last_=goog.now()}}}};a.dispatchTick=function(){this.dispatchEvent(goog.Timer.TICK)};
a.start=function(){this.enabled=true;if(!this.timer_){this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_);this.last_=goog.now()}};a.stop=function(){this.enabled=false;if(this.timer_){this.timerObject_.clearTimeout(this.timer_);this.timer_=null}};a.disposeInternal=function(){goog.Timer.superClass_.disposeInternal.call(this);this.stop();delete this.timerObject_};goog.Timer.TICK="tick";
goog.Timer.callOnce=function(b,c,d){if(goog.isFunction(b)){if(d)b=goog.bind(b,d)}else if(b&&typeof b.handleEvent=="function")b=goog.bind(b.handleEvent,b);else throw Error("Invalid listener argument");return c>goog.Timer.MAX_TIMEOUT_?-1:goog.Timer.defaultTimerObject.setTimeout(b,c||0)};goog.Timer.clear=function(b){goog.Timer.defaultTimerObject.clearTimeout(b)};goog.structs.getCount=function(b){if(typeof b.getCount=="function")return b.getCount();if(goog.isArrayLike(b)||goog.isString(b))return b.length;return goog.object.getCount(b)};goog.structs.getValues=function(b){if(typeof b.getValues=="function")return b.getValues();if(goog.isString(b))return b.split("");if(goog.isArrayLike(b)){for(var c=[],d=b.length,e=0;e<d;e++)c.push(b[e]);return c}return goog.object.getValues(b)};
goog.structs.getKeys=function(b){if(typeof b.getKeys=="function")return b.getKeys();if(typeof b.getValues!="function"){if(goog.isArrayLike(b)||goog.isString(b)){var c=[];b=b.length;for(var d=0;d<b;d++)c.push(d);return c}return goog.object.getKeys(b)}};
goog.structs.contains=function(b,c){if(typeof b.contains=="function")return b.contains(c);if(typeof b.containsValue=="function")return b.containsValue(c);if(goog.isArrayLike(b)||goog.isString(b))return goog.array.contains(b,c);return goog.object.containsValue(b,c)};goog.structs.isEmpty=function(b){if(typeof b.isEmpty=="function")return b.isEmpty();if(goog.isArrayLike(b)||goog.isString(b))return goog.array.isEmpty(b);return goog.object.isEmpty(b)};
goog.structs.clear=function(b){if(typeof b.clear=="function")b.clear();else goog.isArrayLike(b)?goog.array.clear(b):goog.object.clear(b)};goog.structs.forEach=function(b,c,d){if(typeof b.forEach=="function")b.forEach(c,d);else if(goog.isArrayLike(b)||goog.isString(b))goog.array.forEach(b,c,d);else for(var e=goog.structs.getKeys(b),f=goog.structs.getValues(b),g=f.length,h=0;h<g;h++)c.call(d,f[h],e&&e[h],b)};
goog.structs.filter=function(b,c,d){if(typeof b.filter=="function")return b.filter(c,d);if(goog.isArrayLike(b)||goog.isString(b))return goog.array.filter(b,c,d);var e,f=goog.structs.getKeys(b),g=goog.structs.getValues(b),h=g.length;if(f){e={};for(var i=0;i<h;i++)if(c.call(d,g[i],f[i],b))e[f[i]]=g[i]}else{e=[];for(i=0;i<h;i++)c.call(d,g[i],undefined,b)&&e.push(g[i])}return e};
goog.structs.map=function(b,c,d){if(typeof b.map=="function")return b.map(c,d);if(goog.isArrayLike(b)||goog.isString(b))return goog.array.map(b,c,d);var e,f=goog.structs.getKeys(b),g=goog.structs.getValues(b),h=g.length;if(f){e={};for(var i=0;i<h;i++)e[f[i]]=c.call(d,g[i],f[i],b)}else{e=[];for(i=0;i<h;i++)e[i]=c.call(d,g[i],undefined,b)}return e};
goog.structs.some=function(b,c,d){if(typeof b.some=="function")return b.some(c,d);if(goog.isArrayLike(b)||goog.isString(b))return goog.array.some(b,c,d);for(var e=goog.structs.getKeys(b),f=goog.structs.getValues(b),g=f.length,h=0;h<g;h++)if(c.call(d,f[h],e&&e[h],b))return true;return false};
goog.structs.every=function(b,c,d){if(typeof b.every=="function")return b.every(c,d);if(goog.isArrayLike(b)||goog.isString(b))return goog.array.every(b,c,d);for(var e=goog.structs.getKeys(b),f=goog.structs.getValues(b),g=f.length,h=0;h<g;h++)if(!c.call(d,f[h],e&&e[h],b))return false;return true};goog.iter={};goog.iter.StopIteration="StopIteration"in goog.global?goog.global.StopIteration:Error("StopIteration");goog.iter.Iterator=function(){};goog.iter.Iterator.prototype.next=function(){throw goog.iter.StopIteration;};goog.iter.Iterator.prototype.__iterator__=function(){return this};
goog.iter.toIterator=function(b){if(b instanceof goog.iter.Iterator)return b;if(typeof b.__iterator__=="function")return b.__iterator__(false);if(goog.isArrayLike(b)){var c=0,d=new goog.iter.Iterator;d.next=function(){for(;1;){if(c>=b.length)throw goog.iter.StopIteration;if(c in b)return b[c++];else c++}};return d}throw Error("Not implemented");};
goog.iter.forEach=function(b,c,d){if(goog.isArrayLike(b))try{goog.array.forEach(b,c,d)}catch(e){if(e!==goog.iter.StopIteration)throw e;}else{b=goog.iter.toIterator(b);try{for(;1;)c.call(d,b.next(),undefined,b)}catch(f){if(f!==goog.iter.StopIteration)throw f;}}};goog.iter.filter=function(b,c,d){b=goog.iter.toIterator(b);var e=new goog.iter.Iterator;e.next=function(){for(;1;){var f=b.next();if(c.call(d,f,undefined,b))return f}};return e};
goog.iter.range=function(b,c,d){var e=0,f=b,g=d||1;if(arguments.length>1){e=b;f=c}if(g==0)throw Error("Range step argument must not be zero");var h=new goog.iter.Iterator;h.next=function(){if(g>0&&e>=f||g<0&&e<=f)throw goog.iter.StopIteration;var i=e;e+=g;return i};return h};goog.iter.join=function(b,c){return goog.iter.toArray(b).join(c)};
goog.iter.map=function(b,c,d){b=goog.iter.toIterator(b);var e=new goog.iter.Iterator;e.next=function(){for(;1;){var f=b.next();return c.call(d,f,undefined,b)}};return e};goog.iter.reduce=function(b,c,d,e){var f=d;goog.iter.forEach(b,function(g){f=c.call(e,f,g)});return f};goog.iter.some=function(b,c,d){b=goog.iter.toIterator(b);try{for(;1;)if(c.call(d,b.next(),undefined,b))return true}catch(e){if(e!==goog.iter.StopIteration)throw e;}return false};
goog.iter.every=function(b,c,d){b=goog.iter.toIterator(b);try{for(;1;)if(!c.call(d,b.next(),undefined,b))return false}catch(e){if(e!==goog.iter.StopIteration)throw e;}return true};goog.iter.chain=function(){var b=arguments,c=b.length,d=0,e=new goog.iter.Iterator;e.next=function(){try{if(d>=c)throw goog.iter.StopIteration;var f=goog.iter.toIterator(b[d]);return f.next()}catch(g){if(g!==goog.iter.StopIteration||d>=c)throw g;else{d++;return this.next()}}};return e};
goog.iter.dropWhile=function(b,c,d){b=goog.iter.toIterator(b);var e=new goog.iter.Iterator,f=true;e.next=function(){for(;1;){var g=b.next();if(!(f&&c.call(d,g,undefined,b))){f=false;return g}}};return e};goog.iter.takeWhile=function(b,c,d){b=goog.iter.toIterator(b);var e=new goog.iter.Iterator,f=true;e.next=function(){for(;1;)if(f){var g=b.next();if(c.call(d,g,undefined,b))return g;else f=false}else throw goog.iter.StopIteration;};return e};
goog.iter.toArray=function(b){if(goog.isArrayLike(b))return goog.array.toArray(b);b=goog.iter.toIterator(b);var c=[];goog.iter.forEach(b,function(d){c.push(d)});return c};
goog.iter.equals=function(b,c){b=goog.iter.toIterator(b);c=goog.iter.toIterator(c);var d,e;try{for(;1;){d=e=false;var f=b.next();d=true;var g=c.next();e=true;if(f!=g)return false}}catch(h){if(h!==goog.iter.StopIteration)throw h;else{if(d&&!e)return false;if(!e)try{c.next();return false}catch(i){if(i!==goog.iter.StopIteration)throw i;return true}}}return false};goog.iter.nextOrValue=function(b,c){try{return goog.iter.toIterator(b).next()}catch(d){if(d!=goog.iter.StopIteration)throw d;return c}};goog.structs.Map=function(b){this.map_={};this.keys_=[];var c=arguments.length;if(c>1){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else b&&this.addAll(b)};a=goog.structs.Map.prototype;a.count_=0;a.version_=0;a.getCount=function(){return this.count_};a.getValues=function(){this.cleanupKeysArray_();for(var b=[],c=0;c<this.keys_.length;c++){var d=this.keys_[c];b.push(this.map_[d])}return b};
a.getKeys=function(){this.cleanupKeysArray_();return this.keys_.concat()};a.containsKey=function(b){return goog.structs.Map.hasKey_(this.map_,b)};a.containsValue=function(b){for(var c=0;c<this.keys_.length;c++){var d=this.keys_[c];if(goog.structs.Map.hasKey_(this.map_,d)&&this.map_[d]==b)return true}return false};
a.equals=function(b,c){if(this===b)return true;if(this.count_!=b.getCount())return false;c=c||goog.structs.Map.defaultEquals;this.cleanupKeysArray_();for(var d,e=0;d=this.keys_[e];e++)if(!c(this.get(d),b.get(d)))return false;return true};goog.structs.Map.defaultEquals=function(b,c){return b===c};a=goog.structs.Map.prototype;a.isEmpty=function(){return this.count_==0};a.clear=function(){this.map_={};this.version_=this.count_=this.keys_.length=0};
a.remove=function(b){if(goog.structs.Map.hasKey_(this.map_,b)){delete this.map_[b];this.count_--;this.version_++;this.keys_.length>2*this.count_&&this.cleanupKeysArray_();return true}return false};
a.cleanupKeysArray_=function(){if(this.count_!=this.keys_.length){for(var b=0,c=0;b<this.keys_.length;){var d=this.keys_[b];if(goog.structs.Map.hasKey_(this.map_,d))this.keys_[c++]=d;b++}this.keys_.length=c}if(this.count_!=this.keys_.length){var e={};for(c=b=0;b<this.keys_.length;){d=this.keys_[b];if(!goog.structs.Map.hasKey_(e,d)){this.keys_[c++]=d;e[d]=1}b++}this.keys_.length=c}};a.get=function(b,c){if(goog.structs.Map.hasKey_(this.map_,b))return this.map_[b];return c};
a.set=function(b,c){if(!goog.structs.Map.hasKey_(this.map_,b)){this.count_++;this.keys_.push(b);this.version_++}this.map_[b]=c};a.addAll=function(b){var c;if(b instanceof goog.structs.Map){c=b.getKeys();b=b.getValues()}else{c=goog.object.getKeys(b);b=goog.object.getValues(b)}for(var d=0;d<c.length;d++)this.set(c[d],b[d])};a.clone=function(){return new goog.structs.Map(this)};
a.transpose=function(){for(var b=new goog.structs.Map,c=0;c<this.keys_.length;c++){var d=this.keys_[c],e=this.map_[d];b.set(e,d)}return b};a.toObject=function(){this.cleanupKeysArray_();for(var b={},c=0;c<this.keys_.length;c++){var d=this.keys_[c];b[d]=this.map_[d]}return b};a.getKeyIterator=function(){return this.__iterator__(true)};a.getValueIterator=function(){return this.__iterator__(false)};
a.__iterator__=function(b){this.cleanupKeysArray_();var c=0,d=this.keys_,e=this.map_,f=this.version_,g=this,h=new goog.iter.Iterator;h.next=function(){for(;1;){if(f!=g.version_)throw Error("The map has changed since the iterator was created");if(c>=d.length)throw goog.iter.StopIteration;var i=d[c++];return b?i:e[i]}};return h};goog.structs.Map.hasKey_=function(b,c){return Object.prototype.hasOwnProperty.call(b,c)};goog.structs.Set=function(b){this.map_=new goog.structs.Map;b&&this.addAll(b)};goog.structs.Set.getKey_=function(b){var c=typeof b;return c=="object"&&b||c=="function"?"o"+goog.getUid(b):c.substr(0,1)+b};a=goog.structs.Set.prototype;a.getCount=function(){return this.map_.getCount()};a.add=function(b){this.map_.set(goog.structs.Set.getKey_(b),b)};a.addAll=function(b){b=goog.structs.getValues(b);for(var c=b.length,d=0;d<c;d++)this.add(b[d])};
a.removeAll=function(b){b=goog.structs.getValues(b);for(var c=b.length,d=0;d<c;d++)this.remove(b[d])};a.remove=function(b){return this.map_.remove(goog.structs.Set.getKey_(b))};a.clear=function(){this.map_.clear()};a.isEmpty=function(){return this.map_.isEmpty()};a.contains=function(b){return this.map_.containsKey(goog.structs.Set.getKey_(b))};a.containsAll=function(b){return goog.structs.every(b,this.contains,this)};
a.intersection=function(b){var c=new goog.structs.Set;b=goog.structs.getValues(b);for(var d=0;d<b.length;d++){var e=b[d];this.contains(e)&&c.add(e)}return c};a.getValues=function(){return this.map_.getValues()};a.clone=function(){return new goog.structs.Set(this)};a.equals=function(b){return this.getCount()==goog.structs.getCount(b)&&this.isSubsetOf(b)};
a.isSubsetOf=function(b){var c=goog.structs.getCount(b);if(this.getCount()>c)return false;if(!(b instanceof goog.structs.Set)&&c>5)b=new goog.structs.Set(b);return goog.structs.every(this,function(d){return goog.structs.contains(b,d)})};a.__iterator__=function(){return this.map_.__iterator__(false)};goog.debug.catchErrors=function(b,c,d){d=d||goog.global;var e=d.onerror;d.onerror=function(f,g,h){e&&e(f,g,h);g=String(g).split(/[\/\\]/).pop();b({message:f,fileName:g,line:h});return Boolean(c)}};goog.debug.expose=function(b,c){if(typeof b=="undefined")return"undefined";if(b==null)return"NULL";var d=[];for(var e in b)if(!(!c&&goog.isFunction(b[e]))){var f=e+" = ";try{f+=b[e]}catch(g){f+="*** "+g+" ***"}d.push(f)}return d.join("\n")};
goog.debug.deepExpose=function(b,c){var d=new goog.structs.Set,e=[];function f(g,h){var i=h+"  ";function j(n){return n.replace(/\n/g,"\n"+h)}try{if(goog.isDef(g))if(goog.isNull(g))e.push("NULL");else if(goog.isString(g))e.push('"'+j(g)+'"');else if(goog.isFunction(g))e.push(j(String(g)));else if(goog.isObject(g))if(d.contains(g))e.push("*** reference loop detected ***");else{d.add(g);e.push("{");for(var k in g)if(!(!c&&goog.isFunction(g[k]))){e.push("\n");e.push(i);e.push(k+" = ");f(g[k],i)}e.push("\n"+
h+"}")}else e.push(g);else e.push("undefined")}catch(l){e.push("*** "+l+" ***")}}f(b,"");return e.join("")};goog.debug.exposeArray=function(b){for(var c=[],d=0;d<b.length;d++)goog.isArray(b[d])?c.push(goog.debug.exposeArray(b[d])):c.push(b[d]);return"[ "+c.join(", ")+" ]"};
goog.debug.exposeException=function(b,c){try{var d=goog.debug.normalizeErrorObject(b),e="Message: "+goog.string.htmlEscape(d.message)+'\nUrl: <a href="view-source:'+d.fileName+'" target="_new">'+d.fileName+"</a>\nLine: "+d.lineNumber+"\n\nBrowser stack:\n"+goog.string.htmlEscape(d.stack+"-> ")+"[end]\n\nJS stack traversal:\n"+goog.string.htmlEscape(goog.debug.getStacktrace(c)+"-> ");return e}catch(f){return"Exception trying to expose exception! You win, we lose. "+f}};
goog.debug.normalizeErrorObject=function(b){var c=goog.getObjectByName("window.location.href");return typeof b=="string"?{message:b,name:"Unknown error",lineNumber:"Not available",fileName:c,stack:"Not available"}:!b.lineNumber||!b.fileName||!b.stack?{message:b.message,name:b.name,lineNumber:b.lineNumber||b.line||"Not available",fileName:b.fileName||b.filename||b.sourceURL||c,stack:b.stack||"Not available"}:b};
goog.debug.enhanceError=function(b,c){var d=typeof b=="string"?Error(b):b;if(!d.stack)d.stack=goog.debug.getStacktrace(arguments.callee.caller);if(c){for(var e=0;d["message"+e];)++e;d["message"+e]=String(c)}return d};
goog.debug.getStacktraceSimple=function(b){for(var c=[],d=arguments.callee.caller,e=0;d&&(!b||e<b);){c.push(goog.debug.getFunctionName(d));c.push("()\n");try{d=d.caller}catch(f){c.push("[exception trying to get caller]\n");break}e++;if(e>=goog.debug.MAX_STACK_DEPTH){c.push("[...long stack...]");break}}b&&e>=b?c.push("[...reached max depth limit...]"):c.push("[end]");return c.join("")};goog.debug.MAX_STACK_DEPTH=50;
goog.debug.getStacktrace=function(b){return goog.debug.getStacktraceHelper_(b||arguments.callee.caller,[])};
goog.debug.getStacktraceHelper_=function(b,c){var d=[];if(goog.array.contains(c,b))d.push("[...circular reference...]");else if(b&&c.length<goog.debug.MAX_STACK_DEPTH){d.push(goog.debug.getFunctionName(b)+"(");for(var e=b.arguments,f=0;f<e.length;f++){f>0&&d.push(", ");var g;g=e[f];switch(typeof g){case "object":g=g?"object":"null";break;case "string":g=g;break;case "number":g=String(g);break;case "boolean":g=g?"true":"false";break;case "function":g=(g=goog.debug.getFunctionName(g))?g:"[fn]";break;
case "undefined":default:g=typeof g;break}if(g.length>40)g=g.substr(0,40)+"...";d.push(g)}c.push(b);d.push(")\n");try{d.push(goog.debug.getStacktraceHelper_(b.caller,c))}catch(h){d.push("[exception trying to get caller]\n")}}else b?d.push("[...long stack...]"):d.push("[end]");return d.join("")};goog.debug.getFunctionName=function(b){b=String(b);if(!goog.debug.fnNameCache_[b]){var c=/function ([^\(]+)/.exec(b);if(c){c=c[1];goog.debug.fnNameCache_[b]=c}else goog.debug.fnNameCache_[b]="[Anonymous]"}return goog.debug.fnNameCache_[b]};
goog.debug.makeWhitespaceVisible=function(b){return b.replace(/ /g,"[_]").replace(/\f/g,"[f]").replace(/\n/g,"[n]\n").replace(/\r/g,"[r]").replace(/\t/g,"[t]")};goog.debug.fnNameCache_={};goog.debug.LogRecord=function(b,c,d,e,f){this.reset(b,c,d,e,f)};goog.debug.LogRecord.prototype.sequenceNumber_=0;goog.debug.LogRecord.prototype.exception_=null;goog.debug.LogRecord.prototype.exceptionText_=null;goog.debug.LogRecord.ENABLE_SEQUENCE_NUMBERS=true;goog.debug.LogRecord.nextSequenceNumber_=0;a=goog.debug.LogRecord.prototype;
a.reset=function(b,c,d,e,f){if(goog.debug.LogRecord.ENABLE_SEQUENCE_NUMBERS)this.sequenceNumber_=typeof f=="number"?f:goog.debug.LogRecord.nextSequenceNumber_++;this.time_=e||goog.now();this.level_=b;this.msg_=c;this.loggerName_=d;delete this.exception_;delete this.exceptionText_};a.getLoggerName=function(){return this.loggerName_};a.getException=function(){return this.exception_};a.setException=function(b){this.exception_=b};a.getExceptionText=function(){return this.exceptionText_};
a.setExceptionText=function(b){this.exceptionText_=b};a.setLoggerName=function(b){this.loggerName_=b};a.getLevel=function(){return this.level_};a.setLevel=function(b){this.level_=b};a.getMessage=function(){return this.msg_};a.setMessage=function(b){this.msg_=b};a.getMillis=function(){return this.time_};a.setMillis=function(b){this.time_=b};a.getSequenceNumber=function(){return this.sequenceNumber_};goog.debug.LogBuffer=function(){goog.asserts.assert(goog.debug.LogBuffer.isBufferingEnabled(),"Cannot use goog.debug.LogBuffer without defining goog.debug.LogBuffer.CAPACITY.");this.clear()};goog.debug.LogBuffer.getInstance=function(){if(!goog.debug.LogBuffer.instance_)goog.debug.LogBuffer.instance_=new goog.debug.LogBuffer;return goog.debug.LogBuffer.instance_};goog.debug.LogBuffer.CAPACITY=0;
goog.debug.LogBuffer.prototype.addRecord=function(b,c,d){var e=(this.curIndex_+1)%goog.debug.LogBuffer.CAPACITY;this.curIndex_=e;if(this.isFull_){e=this.buffer_[e];e.reset(b,c,d);return e}this.isFull_=e==goog.debug.LogBuffer.CAPACITY-1;return this.buffer_[e]=new goog.debug.LogRecord(b,c,d)};goog.debug.LogBuffer.isBufferingEnabled=function(){return goog.debug.LogBuffer.CAPACITY>0};
goog.debug.LogBuffer.prototype.clear=function(){this.buffer_=new Array(goog.debug.LogBuffer.CAPACITY);this.curIndex_=-1;this.isFull_=false};goog.debug.LogBuffer.prototype.forEachRecord=function(b){var c=this.buffer_;if(c[0]){var d=this.curIndex_,e=this.isFull_?d:-1;do{e=(e+1)%goog.debug.LogBuffer.CAPACITY;b(c[e])}while(e!=d)}};goog.debug.Logger=function(b){this.name_=b};goog.debug.Logger.prototype.parent_=null;goog.debug.Logger.prototype.level_=null;goog.debug.Logger.prototype.children_=null;goog.debug.Logger.prototype.handlers_=null;goog.debug.Logger.ENABLE_HIERARCHY=true;if(!goog.debug.Logger.ENABLE_HIERARCHY)goog.debug.Logger.rootHandlers_=[];goog.debug.Logger.Level=function(b,c){this.name=b;this.value=c};goog.debug.Logger.Level.prototype.toString=function(){return this.name};
goog.debug.Logger.Level.OFF=new goog.debug.Logger.Level("OFF",Infinity);goog.debug.Logger.Level.SHOUT=new goog.debug.Logger.Level("SHOUT",1200);goog.debug.Logger.Level.SEVERE=new goog.debug.Logger.Level("SEVERE",1E3);goog.debug.Logger.Level.WARNING=new goog.debug.Logger.Level("WARNING",900);goog.debug.Logger.Level.INFO=new goog.debug.Logger.Level("INFO",800);goog.debug.Logger.Level.CONFIG=new goog.debug.Logger.Level("CONFIG",700);goog.debug.Logger.Level.FINE=new goog.debug.Logger.Level("FINE",500);
goog.debug.Logger.Level.FINER=new goog.debug.Logger.Level("FINER",400);goog.debug.Logger.Level.FINEST=new goog.debug.Logger.Level("FINEST",300);goog.debug.Logger.Level.ALL=new goog.debug.Logger.Level("ALL",0);
goog.debug.Logger.Level.PREDEFINED_LEVELS=[goog.debug.Logger.Level.OFF,goog.debug.Logger.Level.SHOUT,goog.debug.Logger.Level.SEVERE,goog.debug.Logger.Level.WARNING,goog.debug.Logger.Level.INFO,goog.debug.Logger.Level.CONFIG,goog.debug.Logger.Level.FINE,goog.debug.Logger.Level.FINER,goog.debug.Logger.Level.FINEST,goog.debug.Logger.Level.ALL];goog.debug.Logger.Level.predefinedLevelsCache_=null;
goog.debug.Logger.Level.createPredefinedLevelsCache_=function(){goog.debug.Logger.Level.predefinedLevelsCache_={};for(var b=0,c;c=goog.debug.Logger.Level.PREDEFINED_LEVELS[b];b++){goog.debug.Logger.Level.predefinedLevelsCache_[c.value]=c;goog.debug.Logger.Level.predefinedLevelsCache_[c.name]=c}};
goog.debug.Logger.Level.getPredefinedLevel=function(b){goog.debug.Logger.Level.predefinedLevelsCache_||goog.debug.Logger.Level.createPredefinedLevelsCache_();return goog.debug.Logger.Level.predefinedLevelsCache_[b]||null};
goog.debug.Logger.Level.getPredefinedLevelByValue=function(b){goog.debug.Logger.Level.predefinedLevelsCache_||goog.debug.Logger.Level.createPredefinedLevelsCache_();if(b in goog.debug.Logger.Level.predefinedLevelsCache_)return goog.debug.Logger.Level.predefinedLevelsCache_[b];for(var c=0;c<goog.debug.Logger.Level.PREDEFINED_LEVELS.length;++c){var d=goog.debug.Logger.Level.PREDEFINED_LEVELS[c];if(d.value<=b)return d}return null};goog.debug.Logger.getLogger=function(b){return goog.debug.LogManager.getLogger(b)};
a=goog.debug.Logger.prototype;a.getName=function(){return this.name_};a.addHandler=function(b){if(goog.debug.Logger.ENABLE_HIERARCHY){if(!this.handlers_)this.handlers_=[];this.handlers_.push(b)}else{goog.asserts.assert(!this.name_,"Cannot call addHandler on a non-root logger when goog.debug.Logger.ENABLE_HIERARCHY is false.");goog.debug.Logger.rootHandlers_.push(b)}};
a.removeHandler=function(b){var c=goog.debug.Logger.ENABLE_HIERARCHY?this.handlers_:goog.debug.Logger.rootHandlers_;return!!c&&goog.array.remove(c,b)};a.getParent=function(){return this.parent_};a.getChildren=function(){if(!this.children_)this.children_={};return this.children_};
a.setLevel=function(b){if(goog.debug.Logger.ENABLE_HIERARCHY)this.level_=b;else{goog.asserts.assert(!this.name_,"Cannot call setLevel() on a non-root logger when goog.debug.Logger.ENABLE_HIERARCHY is false.");goog.debug.Logger.rootLevel_=b}};a.getLevel=function(){return this.level_};
a.getEffectiveLevel=function(){if(!goog.debug.Logger.ENABLE_HIERARCHY)return goog.debug.Logger.rootLevel_;if(this.level_)return this.level_;if(this.parent_)return this.parent_.getEffectiveLevel();goog.asserts.fail("Root logger has no level set.");return null};a.isLoggable=function(b){return b.value>=this.getEffectiveLevel().value};a.log=function(b,c,d){this.isLoggable(b)&&this.doLogRecord_(this.getLogRecord(b,c,d))};
a.getLogRecord=function(b,c,d){var e=goog.debug.LogBuffer.isBufferingEnabled()?goog.debug.LogBuffer.getInstance().addRecord(b,c,this.name_):new goog.debug.LogRecord(b,String(c),this.name_);if(d){e.setException(d);e.setExceptionText(goog.debug.exposeException(d,arguments.callee.caller))}return e};a.shout=function(b,c){this.log(goog.debug.Logger.Level.SHOUT,b,c)};a.severe=function(b,c){this.log(goog.debug.Logger.Level.SEVERE,b,c)};a.warning=function(b,c){this.log(goog.debug.Logger.Level.WARNING,b,c)};
a.info=function(b,c){this.log(goog.debug.Logger.Level.INFO,b,c)};a.config=function(b,c){this.log(goog.debug.Logger.Level.CONFIG,b,c)};a.fine=function(b,c){this.log(goog.debug.Logger.Level.FINE,b,c)};a.finer=function(b,c){this.log(goog.debug.Logger.Level.FINER,b,c)};a.finest=function(b,c){this.log(goog.debug.Logger.Level.FINEST,b,c)};a.logRecord=function(b){this.isLoggable(b.getLevel())&&this.doLogRecord_(b)};
a.doLogRecord_=function(b){if(goog.debug.Logger.ENABLE_HIERARCHY)for(var c=this;c;){c.callPublish_(b);c=c.getParent()}else{c=0;for(var d;d=goog.debug.Logger.rootHandlers_[c++];)d(b)}};a.callPublish_=function(b){if(this.handlers_)for(var c=0,d;d=this.handlers_[c];c++)d(b)};a.setParent_=function(b){this.parent_=b};a.addChild_=function(b,c){this.getChildren()[b]=c};goog.debug.LogManager={};goog.debug.LogManager.loggers_={};goog.debug.LogManager.rootLogger_=null;
goog.debug.LogManager.initialize=function(){if(!goog.debug.LogManager.rootLogger_){goog.debug.LogManager.rootLogger_=new goog.debug.Logger("");goog.debug.LogManager.loggers_[""]=goog.debug.LogManager.rootLogger_;goog.debug.LogManager.rootLogger_.setLevel(goog.debug.Logger.Level.CONFIG)}};goog.debug.LogManager.getLoggers=function(){return goog.debug.LogManager.loggers_};goog.debug.LogManager.getRoot=function(){goog.debug.LogManager.initialize();return goog.debug.LogManager.rootLogger_};
goog.debug.LogManager.getLogger=function(b){goog.debug.LogManager.initialize();var c=goog.debug.LogManager.loggers_[b];return c||goog.debug.LogManager.createLogger_(b)};goog.debug.LogManager.createFunctionForCatchErrors=function(b){return function(c){var d=b||goog.debug.LogManager.getRoot();d.severe("Error: "+c.message+" ("+c.fileName+" @ Line: "+c.line+")")}};
goog.debug.LogManager.createLogger_=function(b){var c=new goog.debug.Logger(b);if(goog.debug.Logger.ENABLE_HIERARCHY){var d=b.lastIndexOf("."),e=b.substr(0,d);d=b.substr(d+1);e=goog.debug.LogManager.getLogger(e);e.addChild_(d,c);c.setParent_(e)}return goog.debug.LogManager.loggers_[b]=c};goog.json={};goog.json.isValid_=function(b){if(/^\s*$/.test(b))return false;var c=/\\["\\\/bfnrtu]/g,d=/"[^"\\\n\r\u2028\u2029\x00-\x08\x10-\x1f\x80-\x9f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,e=/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,f=/^[\],:{}\s\u2028\u2029]*$/;return f.test(b.replace(c,"@").replace(d,"]").replace(e,""))};goog.json.parse=function(b){b=String(b);if(goog.json.isValid_(b))try{return eval("("+b+")")}catch(c){}throw Error("Invalid JSON string: "+b);};
goog.json.unsafeParse=function(b){return eval("("+b+")")};goog.json.serialize=function(b){return(new goog.json.Serializer).serialize(b)};goog.json.Serializer=function(){};goog.json.Serializer.prototype.serialize=function(b){var c=[];this.serialize_(b,c);return c.join("")};
goog.json.Serializer.prototype.serialize_=function(b,c){switch(typeof b){case "string":this.serializeString_(b,c);break;case "number":this.serializeNumber_(b,c);break;case "boolean":c.push(b);break;case "undefined":c.push("null");break;case "object":if(b==null){c.push("null");break}if(goog.isArray(b)){this.serializeArray_(b,c);break}this.serializeObject_(b,c);break;case "function":break;default:throw Error("Unknown type: "+typeof b);}};
goog.json.Serializer.charToJsonCharCache_={'"':'\\"',"\\":"\\\\","/":"\\/","\u0008":"\\b","\u000c":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\u000b":"\\u000b"};goog.json.Serializer.charsToReplace_=/\uffff/.test("\uffff")?/[\\\"\x00-\x1f\x7f-\uffff]/g:/[\\\"\x00-\x1f\x7f-\xff]/g;
goog.json.Serializer.prototype.serializeString_=function(b,c){c.push('"',b.replace(goog.json.Serializer.charsToReplace_,function(d){if(d in goog.json.Serializer.charToJsonCharCache_)return goog.json.Serializer.charToJsonCharCache_[d];var e=d.charCodeAt(0),f="\\u";if(e<16)f+="000";else if(e<256)f+="00";else if(e<4096)f+="0";return goog.json.Serializer.charToJsonCharCache_[d]=f+e.toString(16)}),'"')};goog.json.Serializer.prototype.serializeNumber_=function(b,c){c.push(isFinite(b)&&!isNaN(b)?b:"null")};
goog.json.Serializer.prototype.serializeArray_=function(b,c){var d=b.length;c.push("[");for(var e="",f=0;f<d;f++){c.push(e);this.serialize_(b[f],c);e=","}c.push("]")};goog.json.Serializer.prototype.serializeObject_=function(b,c){c.push("{");var d="";for(var e in b)if(b.hasOwnProperty(e)){var f=b[e];if(typeof f!="function"){c.push(d);this.serializeString_(e,c);c.push(":");this.serialize_(f,c);d=","}}c.push("}")};goog.net={};goog.net.ErrorCode={NO_ERROR:0,ACCESS_DENIED:1,FILE_NOT_FOUND:2,FF_SILENT_ERROR:3,CUSTOM_ERROR:4,EXCEPTION:5,HTTP_ERROR:6,ABORT:7,TIMEOUT:8,OFFLINE:9};
goog.net.ErrorCode.getDebugMessage=function(b){switch(b){case goog.net.ErrorCode.NO_ERROR:return"No Error";case goog.net.ErrorCode.ACCESS_DENIED:return"Access denied to content document";case goog.net.ErrorCode.FILE_NOT_FOUND:return"File not found";case goog.net.ErrorCode.FF_SILENT_ERROR:return"Firefox silently errored";case goog.net.ErrorCode.CUSTOM_ERROR:return"Application custom error";case goog.net.ErrorCode.EXCEPTION:return"An exception occurred";case goog.net.ErrorCode.HTTP_ERROR:return"Http response at 400 or 500 level";
case goog.net.ErrorCode.ABORT:return"Request was aborted";case goog.net.ErrorCode.TIMEOUT:return"Request timed out";case goog.net.ErrorCode.OFFLINE:return"The resource is not available offline";default:return"Unrecognized error code"}};goog.net.EventType={COMPLETE:"complete",SUCCESS:"success",ERROR:"error",ABORT:"abort",READY:"ready",READY_STATE_CHANGE:"readystatechange",TIMEOUT:"timeout",INCREMENTAL_DATA:"incrementaldata",PROGRESS:"progress"};goog.net.XmlHttpFactory=function(){};goog.net.XmlHttpFactory.prototype.cachedOptions_=null;goog.net.XmlHttpFactory.prototype.getOptions=function(){return this.cachedOptions_||(this.cachedOptions_=this.internalGetOptions())};goog.net.WrapperXmlHttpFactory=function(b,c){goog.net.XmlHttpFactory.call(this);this.xhrFactory_=b;this.optionsFactory_=c};goog.inherits(goog.net.WrapperXmlHttpFactory,goog.net.XmlHttpFactory);goog.net.WrapperXmlHttpFactory.prototype.createInstance=function(){return this.xhrFactory_()};goog.net.WrapperXmlHttpFactory.prototype.getOptions=function(){return this.optionsFactory_()};goog.net.XmlHttp=function(){return goog.net.XmlHttp.factory_.createInstance()};goog.net.XmlHttp.getOptions=function(){return goog.net.XmlHttp.factory_.getOptions()};goog.net.XmlHttp.OptionType={USE_NULL_FUNCTION:0,LOCAL_REQUEST_ERROR:1};goog.net.XmlHttp.ReadyState={UNINITIALIZED:0,LOADING:1,LOADED:2,INTERACTIVE:3,COMPLETE:4};goog.net.XmlHttp.setFactory=function(b,c){goog.net.XmlHttp.setGlobalFactory(new goog.net.WrapperXmlHttpFactory(b,c))};
goog.net.XmlHttp.setGlobalFactory=function(b){goog.net.XmlHttp.factory_=b};goog.net.DefaultXmlHttpFactory=function(){goog.net.XmlHttpFactory.call(this)};goog.inherits(goog.net.DefaultXmlHttpFactory,goog.net.XmlHttpFactory);goog.net.DefaultXmlHttpFactory.prototype.createInstance=function(){var b=this.getProgId_();return b?new ActiveXObject(b):new XMLHttpRequest};
goog.net.DefaultXmlHttpFactory.prototype.internalGetOptions=function(){var b=this.getProgId_(),c={};if(b){c[goog.net.XmlHttp.OptionType.USE_NULL_FUNCTION]=true;c[goog.net.XmlHttp.OptionType.LOCAL_REQUEST_ERROR]=true}return c};goog.net.DefaultXmlHttpFactory.prototype.ieProgId_=null;
goog.net.DefaultXmlHttpFactory.prototype.getProgId_=function(){if(!this.ieProgId_&&typeof XMLHttpRequest=="undefined"&&typeof ActiveXObject!="undefined"){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{new ActiveXObject(d);return this.ieProgId_=d}catch(e){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return this.ieProgId_};goog.net.XmlHttp.setGlobalFactory(new goog.net.DefaultXmlHttpFactory);goog.net.XhrMonitor_=function(){if(goog.userAgent.GECKO){this.contextsToXhr_={};this.xhrToContexts_={};this.stack_=[]}};goog.net.XhrMonitor_.getKey=function(b){return goog.isString(b)?b:goog.isObject(b)?goog.getUid(b):""};a=goog.net.XhrMonitor_.prototype;a.logger_=goog.debug.Logger.getLogger("goog.net.xhrMonitor");a.enabled_=goog.userAgent.GECKO;a.setEnabled=function(b){this.enabled_=goog.userAgent.GECKO&&b};
a.pushContext=function(b){if(this.enabled_){var c=goog.net.XhrMonitor_.getKey(b);this.logger_.finest("Pushing context: "+b+" ("+c+")");this.stack_.push(c)}};a.popContext=function(){if(this.enabled_){var b=this.stack_.pop();this.logger_.finest("Popping context: "+b);this.updateDependentContexts_(b)}};a.isContextSafe=function(b){if(!this.enabled_)return true;var c=this.contextsToXhr_[goog.net.XhrMonitor_.getKey(b)];this.logger_.fine("Context is safe : "+b+" - "+c);return!c};
a.markXhrOpen=function(b){if(this.enabled_){b=goog.getUid(b);this.logger_.fine("Opening XHR : "+b);for(var c=0;c<this.stack_.length;c++){var d=this.stack_[c];this.addToMap_(this.contextsToXhr_,d,b);this.addToMap_(this.xhrToContexts_,b,d)}}};a.markXhrClosed=function(b){if(this.enabled_){b=goog.getUid(b);this.logger_.fine("Closing XHR : "+b);delete this.xhrToContexts_[b];for(var c in this.contextsToXhr_){goog.array.remove(this.contextsToXhr_[c],b);this.contextsToXhr_[c].length==0&&delete this.contextsToXhr_[c]}}};
a.updateDependentContexts_=function(b){var c=this.xhrToContexts_[b],d=this.contextsToXhr_[b];if(c&&d){this.logger_.finest("Updating dependent contexts");goog.array.forEach(c,function(e){goog.array.forEach(d,function(f){this.addToMap_(this.contextsToXhr_,e,f);this.addToMap_(this.xhrToContexts_,f,e)},this)},this)}};a.addToMap_=function(b,c,d){b[c]||(b[c]=[]);goog.array.contains(b[c],d)||b[c].push(d)};goog.net.xhrMonitor=new goog.net.XhrMonitor_;goog.net.XhrIo=function(b){goog.events.EventTarget.call(this);this.headers=new goog.structs.Map;this.xmlHttpFactory_=b||null};goog.inherits(goog.net.XhrIo,goog.events.EventTarget);goog.net.XhrIo.prototype.logger_=goog.debug.Logger.getLogger("goog.net.XhrIo");goog.net.XhrIo.CONTENT_TYPE_HEADER="Content-Type";goog.net.XhrIo.FORM_CONTENT_TYPE="application/x-www-form-urlencoded;charset=utf-8";goog.net.XhrIo.sendInstances_=[];
goog.net.XhrIo.send=function(b,c,d,e,f,g){var h=new goog.net.XhrIo;goog.net.XhrIo.sendInstances_.push(h);c&&goog.events.listen(h,goog.net.EventType.COMPLETE,c);goog.events.listen(h,goog.net.EventType.READY,goog.partial(goog.net.XhrIo.cleanupSend_,h));g&&h.setTimeoutInterval(g);h.send(b,d,e,f)};goog.net.XhrIo.cleanup=function(){for(var b=goog.net.XhrIo.sendInstances_;b.length;)b.pop().dispose()};goog.net.XhrIo.protectEntryPoints=function(b){goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_=b.protectEntryPoint(goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_)};
goog.net.XhrIo.cleanupSend_=function(b){b.dispose();goog.array.remove(goog.net.XhrIo.sendInstances_,b)};a=goog.net.XhrIo.prototype;a.active_=false;a.xhr_=null;a.xhrOptions_=null;a.lastUri_="";a.lastMethod_="";a.lastErrorCode_=goog.net.ErrorCode.NO_ERROR;a.lastError_="";a.errorDispatched_=false;a.inSend_=false;a.inOpen_=false;a.inAbort_=false;a.timeoutInterval_=0;a.timeoutId_=null;a.getTimeoutInterval=function(){return this.timeoutInterval_};
a.setTimeoutInterval=function(b){this.timeoutInterval_=Math.max(0,b)};
a.send=function(b,c,d,e){if(this.active_)throw Error("[goog.net.XhrIo] Object is active with another request");c=c||"GET";this.lastUri_=b;this.lastError_="";this.lastErrorCode_=goog.net.ErrorCode.NO_ERROR;this.lastMethod_=c;this.errorDispatched_=false;this.active_=true;this.xhr_=this.createXhr();this.xhrOptions_=this.xmlHttpFactory_?this.xmlHttpFactory_.getOptions():goog.net.XmlHttp.getOptions();goog.net.xhrMonitor.markXhrOpen(this.xhr_);this.xhr_.onreadystatechange=goog.bind(this.onReadyStateChange_,
this);try{this.logger_.fine(this.formatMsg_("Opening Xhr"));this.inOpen_=true;this.xhr_.open(c,b,true);this.inOpen_=false}catch(f){this.logger_.fine(this.formatMsg_("Error opening Xhr: "+f.message));this.error_(goog.net.ErrorCode.EXCEPTION,f);return}b=d||"";var g=this.headers.clone();e&&goog.structs.forEach(e,function(i,j){g.set(j,i)});c=="POST"&&!g.containsKey(goog.net.XhrIo.CONTENT_TYPE_HEADER)&&g.set(goog.net.XhrIo.CONTENT_TYPE_HEADER,goog.net.XhrIo.FORM_CONTENT_TYPE);goog.structs.forEach(g,function(i,
j){this.xhr_.setRequestHeader(j,i)},this);try{if(this.timeoutId_){goog.Timer.defaultTimerObject.clearTimeout(this.timeoutId_);this.timeoutId_=null}if(this.timeoutInterval_>0){this.logger_.fine(this.formatMsg_("Will abort after "+this.timeoutInterval_+"ms if incomplete"));this.timeoutId_=goog.Timer.defaultTimerObject.setTimeout(goog.bind(this.timeout_,this),this.timeoutInterval_)}this.logger_.fine(this.formatMsg_("Sending request"));this.inSend_=true;this.xhr_.send(b);this.inSend_=false}catch(h){this.logger_.fine(this.formatMsg_("Send error: "+
h.message));this.error_(goog.net.ErrorCode.EXCEPTION,h)}};a.createXhr=function(){return this.xmlHttpFactory_?this.xmlHttpFactory_.createInstance():new goog.net.XmlHttp};a.dispatchEvent=function(b){if(this.xhr_){goog.net.xhrMonitor.pushContext(this.xhr_);try{return goog.net.XhrIo.superClass_.dispatchEvent.call(this,b)}finally{goog.net.xhrMonitor.popContext()}}else return goog.net.XhrIo.superClass_.dispatchEvent.call(this,b)};
a.timeout_=function(){if(typeof goog!="undefined")if(this.xhr_){this.lastError_="Timed out after "+this.timeoutInterval_+"ms, aborting";this.lastErrorCode_=goog.net.ErrorCode.TIMEOUT;this.logger_.fine(this.formatMsg_(this.lastError_));this.dispatchEvent(goog.net.EventType.TIMEOUT);this.abort(goog.net.ErrorCode.TIMEOUT)}};a.error_=function(b,c){this.active_=false;if(this.xhr_){this.inAbort_=true;this.xhr_.abort();this.inAbort_=false}this.lastError_=c;this.lastErrorCode_=b;this.dispatchErrors_();this.cleanUpXhr_()};
a.dispatchErrors_=function(){if(!this.errorDispatched_){this.errorDispatched_=true;this.dispatchEvent(goog.net.EventType.COMPLETE);this.dispatchEvent(goog.net.EventType.ERROR)}};a.abort=function(b){if(this.xhr_){this.logger_.fine(this.formatMsg_("Aborting"));this.active_=false;this.inAbort_=true;this.xhr_.abort();this.inAbort_=false;this.lastErrorCode_=b||goog.net.ErrorCode.ABORT;this.dispatchEvent(goog.net.EventType.COMPLETE);this.dispatchEvent(goog.net.EventType.ABORT);this.cleanUpXhr_()}};
a.disposeInternal=function(){if(this.xhr_){if(this.active_){this.active_=false;this.inAbort_=true;this.xhr_.abort();this.inAbort_=false}this.cleanUpXhr_(true)}goog.net.XhrIo.superClass_.disposeInternal.call(this)};a.onReadyStateChange_=function(){!this.inOpen_&&!this.inSend_&&!this.inAbort_?this.onReadyStateChangeEntryPoint_():this.onReadyStateChangeHelper_()};a.onReadyStateChangeEntryPoint_=function(){this.onReadyStateChangeHelper_()};
a.onReadyStateChangeHelper_=function(){if(this.active_)if(typeof goog!="undefined")if(this.xhrOptions_[goog.net.XmlHttp.OptionType.LOCAL_REQUEST_ERROR]&&this.getReadyState()==goog.net.XmlHttp.ReadyState.COMPLETE&&this.getStatus()==2)this.logger_.fine(this.formatMsg_("Local request error detected and ignored"));else if(this.inSend_&&this.getReadyState()==goog.net.XmlHttp.ReadyState.COMPLETE)goog.Timer.defaultTimerObject.setTimeout(goog.bind(this.onReadyStateChange_,this),0);else{this.dispatchEvent(goog.net.EventType.READY_STATE_CHANGE);
if(this.isComplete()){this.logger_.fine(this.formatMsg_("Request complete"));this.active_=false;if(this.isSuccess()){this.dispatchEvent(goog.net.EventType.COMPLETE);this.dispatchEvent(goog.net.EventType.SUCCESS)}else{this.lastErrorCode_=goog.net.ErrorCode.HTTP_ERROR;this.lastError_=this.getStatusText()+" ["+this.getStatus()+"]";this.dispatchErrors_()}this.cleanUpXhr_()}}};
a.cleanUpXhr_=function(b){if(this.xhr_){var c=this.xhr_,d=this.xhrOptions_[goog.net.XmlHttp.OptionType.USE_NULL_FUNCTION]?goog.nullFunction:null;this.xhrOptions_=this.xhr_=null;if(this.timeoutId_){goog.Timer.defaultTimerObject.clearTimeout(this.timeoutId_);this.timeoutId_=null}if(!b){goog.net.xhrMonitor.pushContext(c);this.dispatchEvent(goog.net.EventType.READY);goog.net.xhrMonitor.popContext()}goog.net.xhrMonitor.markXhrClosed(c);try{c.onreadystatechange=d}catch(e){this.logger_.severe("Problem encountered resetting onreadystatechange: "+
e.message)}}};a.isActive=function(){return this.active_};a.isComplete=function(){return this.getReadyState()==goog.net.XmlHttp.ReadyState.COMPLETE};a.isSuccess=function(){switch(this.getStatus()){case 0:case 200:case 204:case 304:return true;default:return false}};a.getReadyState=function(){return this.xhr_?this.xhr_.readyState:goog.net.XmlHttp.ReadyState.UNINITIALIZED};
a.getStatus=function(){try{return this.getReadyState()>goog.net.XmlHttp.ReadyState.LOADED?this.xhr_.status:-1}catch(b){this.logger_.warning("Can not get status: "+b.message);return-1}};a.getStatusText=function(){try{return this.getReadyState()>goog.net.XmlHttp.ReadyState.LOADED?this.xhr_.statusText:""}catch(b){this.logger_.fine("Can not get status: "+b.message);return""}};a.getLastUri=function(){return String(this.lastUri_)};a.getResponseText=function(){return this.xhr_?this.xhr_.responseText:""};
a.getResponseXml=function(){return this.xhr_?this.xhr_.responseXML:null};a.getResponseJson=function(b){if(this.xhr_){var c=this.xhr_.responseText;if(b&&c.indexOf(b)==0)c=c.substring(b.length);return goog.json.parse(c)}};a.getResponseHeader=function(b){return this.xhr_&&this.isComplete()?this.xhr_.getResponseHeader(b):undefined};a.getLastErrorCode=function(){return this.lastErrorCode_};a.getLastError=function(){return goog.isString(this.lastError_)?this.lastError_:String(this.lastError_)};
a.formatMsg_=function(b){return b+" ["+this.lastMethod_+" "+this.lastUri_+" "+this.getStatus()+"]"};goog.debug.entryPointRegistry.register(function(b){goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_=b(goog.net.XhrIo.prototype.onReadyStateChangeEntryPoint_)});goog.dom.a11y={};goog.dom.a11y.State={ACTIVEDESCENDANT:"activedescendant",AUTOCOMPLETE:"autocomplete",CHECKED:"checked",DISABLED:"disabled",EXPANDED:"expanded",HASPOPUP:"haspopup",LABELLEDBY:"labelledby",LEVEL:"level",PRESSED:"pressed",SELECTED:"selected",VALUEMAX:"valuemax",VALUEMIN:"valuemin",VALUENOW:"valuenow",VALUETEXT:"valuetext"};
goog.dom.a11y.Role={BUTTON:"button",CHECKBOX:"checkbox",COMBOBOX:"combobox",DIALOG:"dialog",LINK:"link",LISTBOX:"listbox",MAIN:"main",MENU:"menu",MENUBAR:"menubar",MENU_ITEM:"menuitem",MENU_ITEM_CHECKBOX:"menuitemcheckbox",MENU_ITEM_RADIO:"menuitemradio",NAVIGATION:"navigation",OPTION:"option",GROUP:"group",SLIDER:"slider",TAB:"tab",TAB_LIST:"tablist",TAB_PANEL:"tabpanel",TOOLBAR:"toolbar"};
goog.dom.a11y.setRole=function(b,c){if(goog.userAgent.GECKO||goog.dom.a11y.noBrowserCheck_){b.setAttribute("role",c);b.roleName=c}};goog.dom.a11y.getRole=function(b){return b.roleName||""};goog.dom.a11y.setState=function(b,c,d){if(goog.userAgent.GECKO||goog.dom.a11y.noBrowserCheck_)b.setAttribute("aria-"+c,d)};goog.dom.a11y.getState=function(b,c){return b.getAttribute("aria-"+c)||""};goog.dom.a11y.getNoBrowserCheck=function(){return!!goog.dom.a11y.noBrowserCheck_};
goog.dom.a11y.setNoBrowserCheck=function(b){goog.dom.a11y.noBrowserCheck_=b};goog.dom.a11y.getActiveDescendant=function(b){var c=goog.dom.a11y.getState(b,goog.dom.a11y.State.ACTIVEDESCENDANT);return goog.dom.getOwnerDocument(b).getElementById(c)};goog.dom.a11y.setActiveDescendant=function(b,c){goog.dom.a11y.setState(b,goog.dom.a11y.State.ACTIVEDESCENDANT,c?c.id:"")};goog.dom.iframe={};goog.dom.iframe.BLANK_SOURCE='javascript:""';goog.dom.iframe.STYLES_="border:0;vertical-align:bottom;";goog.dom.iframe.createBlank=function(b,c){return b.createDom("iframe",{frameborder:0,style:goog.dom.iframe.STYLES_+(c||""),src:goog.dom.iframe.BLANK_SOURCE})};goog.dom.iframe.writeContent=function(b,c){b=goog.dom.getFrameContentDocument(b);b.open();b.write(c);b.close()};
goog.dom.iframe.createWithContent=function(b,c,d,e,f){var g=goog.dom.getDomHelper(b),h=[];f||h.push("<!DOCTYPE html>");h.push("<html><head>",c,"</head><body>",d,"</body></html>");c=goog.dom.iframe.createBlank(g,e);b.appendChild(c);goog.dom.iframe.writeContent(c,h.join(""));return c};goog.events.FocusHandler=function(b){goog.events.EventTarget.call(this);this.element_=b;b=goog.userAgent.IE?"focusin":"focus";var c=goog.userAgent.IE?"focusout":"blur";this.listenKeyIn_=goog.events.listen(this.element_,b,this,!goog.userAgent.IE);this.listenKeyOut_=goog.events.listen(this.element_,c,this,!goog.userAgent.IE)};goog.inherits(goog.events.FocusHandler,goog.events.EventTarget);goog.events.FocusHandler.EventType={FOCUSIN:"focusin",FOCUSOUT:"focusout"};
goog.events.FocusHandler.prototype.handleEvent=function(b){var c=b.getBrowserEvent();c=new goog.events.BrowserEvent(c);c.type=b.type=="focusin"||b.type=="focus"?goog.events.FocusHandler.EventType.FOCUSIN:goog.events.FocusHandler.EventType.FOCUSOUT;try{this.dispatchEvent(c)}finally{c.dispose()}};
goog.events.FocusHandler.prototype.disposeInternal=function(){goog.events.FocusHandler.superClass_.disposeInternal.call(this);goog.events.unlistenByKey(this.listenKeyIn_);goog.events.unlistenByKey(this.listenKeyOut_);delete this.element_};goog.events.KeyCodes={MAC_ENTER:3,BACKSPACE:8,TAB:9,NUM_CENTER:12,ENTER:13,SHIFT:16,CTRL:17,ALT:18,PAUSE:19,CAPS_LOCK:20,ESC:27,SPACE:32,PAGE_UP:33,PAGE_DOWN:34,END:35,HOME:36,LEFT:37,UP:38,RIGHT:39,DOWN:40,PRINT_SCREEN:44,INSERT:45,DELETE:46,ZERO:48,ONE:49,TWO:50,THREE:51,FOUR:52,FIVE:53,SIX:54,SEVEN:55,EIGHT:56,NINE:57,QUESTION_MARK:63,A:65,B:66,C:67,D:68,E:69,F:70,G:71,H:72,I:73,J:74,K:75,L:76,M:77,N:78,O:79,P:80,Q:81,R:82,S:83,T:84,U:85,V:86,W:87,X:88,Y:89,Z:90,META:91,CONTEXT_MENU:93,NUM_ZERO:96,
NUM_ONE:97,NUM_TWO:98,NUM_THREE:99,NUM_FOUR:100,NUM_FIVE:101,NUM_SIX:102,NUM_SEVEN:103,NUM_EIGHT:104,NUM_NINE:105,NUM_MULTIPLY:106,NUM_PLUS:107,NUM_MINUS:109,NUM_PERIOD:110,NUM_DIVISION:111,F1:112,F2:113,F3:114,F4:115,F5:116,F6:117,F7:118,F8:119,F9:120,F10:121,F11:122,F12:123,NUMLOCK:144,SEMICOLON:186,DASH:189,EQUALS:187,COMMA:188,PERIOD:190,SLASH:191,APOSTROPHE:192,SINGLE_QUOTE:222,OPEN_SQUARE_BRACKET:219,BACKSLASH:220,CLOSE_SQUARE_BRACKET:221,WIN_KEY:224,MAC_FF_META:224,WIN_IME:229};
goog.events.KeyCodes.isTextModifyingKeyEvent=function(b){if(b.altKey&&!b.ctrlKey||b.metaKey||b.keyCode>=goog.events.KeyCodes.F1&&b.keyCode<=goog.events.KeyCodes.F12)return false;switch(b.keyCode){case goog.events.KeyCodes.ALT:case goog.events.KeyCodes.CAPS_LOCK:case goog.events.KeyCodes.CONTEXT_MENU:case goog.events.KeyCodes.CTRL:case goog.events.KeyCodes.DOWN:case goog.events.KeyCodes.END:case goog.events.KeyCodes.ESC:case goog.events.KeyCodes.HOME:case goog.events.KeyCodes.INSERT:case goog.events.KeyCodes.LEFT:case goog.events.KeyCodes.MAC_FF_META:case goog.events.KeyCodes.META:case goog.events.KeyCodes.NUMLOCK:case goog.events.KeyCodes.NUM_CENTER:case goog.events.KeyCodes.PAGE_DOWN:case goog.events.KeyCodes.PAGE_UP:case goog.events.KeyCodes.PAUSE:case goog.events.KeyCodes.PRINT_SCREEN:case goog.events.KeyCodes.RIGHT:case goog.events.KeyCodes.SHIFT:case goog.events.KeyCodes.UP:case goog.events.KeyCodes.WIN_KEY:return false;
default:return true}};goog.events.KeyCodes.firesKeyPressEvent=function(b,c,d,e,f){if(!goog.userAgent.IE&&!(goog.userAgent.WEBKIT&&goog.userAgent.isVersion("525")))return true;if(goog.userAgent.MAC&&f)return goog.events.KeyCodes.isCharacterKey(b);if(f&&!e)return false;if(!d&&(c==goog.events.KeyCodes.CTRL||c==goog.events.KeyCodes.ALT))return false;if(goog.userAgent.IE&&e&&c==b)return false;switch(b){case goog.events.KeyCodes.ENTER:return true;case goog.events.KeyCodes.ESC:return!goog.userAgent.WEBKIT}return goog.events.KeyCodes.isCharacterKey(b)};
goog.events.KeyCodes.isCharacterKey=function(b){if(b>=goog.events.KeyCodes.ZERO&&b<=goog.events.KeyCodes.NINE)return true;if(b>=goog.events.KeyCodes.NUM_ZERO&&b<=goog.events.KeyCodes.NUM_MULTIPLY)return true;if(b>=goog.events.KeyCodes.A&&b<=goog.events.KeyCodes.Z)return true;if(goog.userAgent.WEBKIT&&b==0)return true;switch(b){case goog.events.KeyCodes.SPACE:case goog.events.KeyCodes.QUESTION_MARK:case goog.events.KeyCodes.NUM_PLUS:case goog.events.KeyCodes.NUM_MINUS:case goog.events.KeyCodes.NUM_PERIOD:case goog.events.KeyCodes.NUM_DIVISION:case goog.events.KeyCodes.SEMICOLON:case goog.events.KeyCodes.DASH:case goog.events.KeyCodes.EQUALS:case goog.events.KeyCodes.COMMA:case goog.events.KeyCodes.PERIOD:case goog.events.KeyCodes.SLASH:case goog.events.KeyCodes.APOSTROPHE:case goog.events.KeyCodes.SINGLE_QUOTE:case goog.events.KeyCodes.OPEN_SQUARE_BRACKET:case goog.events.KeyCodes.BACKSLASH:case goog.events.KeyCodes.CLOSE_SQUARE_BRACKET:return true;
default:return false}};goog.ui={};goog.ui.IdGenerator=function(){};goog.addSingletonGetter(goog.ui.IdGenerator);goog.ui.IdGenerator.prototype.nextId_=0;goog.ui.IdGenerator.prototype.getNextUniqueId=function(){return":"+(this.nextId_++).toString(36)};goog.ui.IdGenerator.instance=goog.ui.IdGenerator.getInstance();goog.ui.Component=function(b){goog.events.EventTarget.call(this);this.dom_=b||goog.dom.getDomHelper();this.rightToLeft_=goog.ui.Component.defaultRightToLeft_};goog.inherits(goog.ui.Component,goog.events.EventTarget);goog.ui.Component.prototype.idGenerator_=goog.ui.IdGenerator.getInstance();goog.ui.Component.defaultRightToLeft_=null;
goog.ui.Component.EventType={BEFORE_SHOW:"beforeshow",SHOW:"show",HIDE:"hide",DISABLE:"disable",ENABLE:"enable",HIGHLIGHT:"highlight",UNHIGHLIGHT:"unhighlight",ACTIVATE:"activate",DEACTIVATE:"deactivate",SELECT:"select",UNSELECT:"unselect",CHECK:"check",UNCHECK:"uncheck",FOCUS:"focus",BLUR:"blur",OPEN:"open",CLOSE:"close",ENTER:"enter",LEAVE:"leave",ACTION:"action",CHANGE:"change"};
goog.ui.Component.Error={NOT_SUPPORTED:"Method not supported",DECORATE_INVALID:"Invalid element to decorate",ALREADY_RENDERED:"Component already rendered",PARENT_UNABLE_TO_BE_SET:"Unable to set parent component",CHILD_INDEX_OUT_OF_BOUNDS:"Child component index out of bounds",NOT_OUR_CHILD:"Child is not in parent component",NOT_IN_DOCUMENT:"Operation not supported while component is not in document",STATE_INVALID:"Invalid component state"};
goog.ui.Component.State={ALL:255,DISABLED:1,HOVER:2,ACTIVE:4,SELECTED:8,CHECKED:16,FOCUSED:32,OPENED:64};
goog.ui.Component.getStateTransitionEvent=function(b,c){switch(b){case goog.ui.Component.State.DISABLED:return c?goog.ui.Component.EventType.DISABLE:goog.ui.Component.EventType.ENABLE;case goog.ui.Component.State.HOVER:return c?goog.ui.Component.EventType.HIGHLIGHT:goog.ui.Component.EventType.UNHIGHLIGHT;case goog.ui.Component.State.ACTIVE:return c?goog.ui.Component.EventType.ACTIVATE:goog.ui.Component.EventType.DEACTIVATE;case goog.ui.Component.State.SELECTED:return c?goog.ui.Component.EventType.SELECT:
goog.ui.Component.EventType.UNSELECT;case goog.ui.Component.State.CHECKED:return c?goog.ui.Component.EventType.CHECK:goog.ui.Component.EventType.UNCHECK;case goog.ui.Component.State.FOCUSED:return c?goog.ui.Component.EventType.FOCUS:goog.ui.Component.EventType.BLUR;case goog.ui.Component.State.OPENED:return c?goog.ui.Component.EventType.OPEN:goog.ui.Component.EventType.CLOSE;default:}throw Error(goog.ui.Component.Error.STATE_INVALID);};
goog.ui.Component.setDefaultRightToLeft=function(b){goog.ui.Component.defaultRightToLeft_=b};a=goog.ui.Component.prototype;a.id_=null;a.inDocument_=false;a.element_=null;a.rightToLeft_=null;a.model_=null;a.parent_=null;a.children_=null;a.childIndex_=null;a.wasDecorated_=false;a.getId=function(){return this.id_||(this.id_=this.idGenerator_.getNextUniqueId())};
a.setId=function(b){if(this.parent_&&this.parent_.childIndex_){goog.object.remove(this.parent_.childIndex_,this.id_);goog.object.add(this.parent_.childIndex_,b,this)}this.id_=b};a.getElement=function(){return this.element_};a.setElementInternal=function(b){this.element_=b};a.getHandler=function(){return this.googUiComponentHandler_||(this.googUiComponentHandler_=new goog.events.EventHandler(this))};
a.setParent=function(b){if(this==b)throw Error(goog.ui.Component.Error.PARENT_UNABLE_TO_BE_SET);if(b&&this.parent_&&this.id_&&this.parent_.getChild(this.id_)&&this.parent_!=b)throw Error(goog.ui.Component.Error.PARENT_UNABLE_TO_BE_SET);this.parent_=b;goog.ui.Component.superClass_.setParentEventTarget.call(this,b)};a.getParent=function(){return this.parent_};
a.setParentEventTarget=function(b){if(this.parent_&&this.parent_!=b)throw Error(goog.ui.Component.Error.NOT_SUPPORTED);goog.ui.Component.superClass_.setParentEventTarget.call(this,b)};a.getDomHelper=function(){return this.dom_};a.isInDocument=function(){return this.inDocument_};a.createDom=function(){this.element_=this.dom_.createElement("div")};a.render=function(b){this.render_(b)};a.renderBefore=function(b){this.render_(b.parentNode,b)};
a.render_=function(b,c){if(this.inDocument_)throw Error(goog.ui.Component.Error.ALREADY_RENDERED);this.element_||this.createDom();b?b.insertBefore(this.element_,c||null):this.dom_.getDocument().body.appendChild(this.element_);if(!this.parent_||this.parent_.isInDocument())this.enterDocument()};
a.decorate=function(b){if(this.inDocument_)throw Error(goog.ui.Component.Error.ALREADY_RENDERED);else if(b&&this.canDecorate(b)){this.wasDecorated_=true;if(!this.dom_||this.dom_.getDocument()!=goog.dom.getOwnerDocument(b))this.dom_=goog.dom.getDomHelper(b);this.decorateInternal(b);this.enterDocument()}else throw Error(goog.ui.Component.Error.DECORATE_INVALID);};a.canDecorate=function(){return true};a.wasDecorated=function(){return this.wasDecorated_};a.decorateInternal=function(b){this.element_=b};
a.enterDocument=function(){this.inDocument_=true;this.forEachChild(function(b){!b.isInDocument()&&b.getElement()&&b.enterDocument()})};a.exitDocument=function(){this.forEachChild(function(b){b.isInDocument()&&b.exitDocument()});this.googUiComponentHandler_&&this.googUiComponentHandler_.removeAll();this.inDocument_=false};
a.disposeInternal=function(){goog.ui.Component.superClass_.disposeInternal.call(this);this.inDocument_&&this.exitDocument();if(this.googUiComponentHandler_){this.googUiComponentHandler_.dispose();delete this.googUiComponentHandler_}this.forEachChild(function(b){b.dispose()});!this.wasDecorated_&&this.element_&&goog.dom.removeNode(this.element_);this.parent_=this.model_=this.element_=this.childIndex_=this.children_=null};a.makeId=function(b){return this.getId()+"."+b};a.getModel=function(){return this.model_};
a.setModel=function(b){this.model_=b};a.getFragmentFromId=function(b){return b.substring(this.getId().length+1)};a.getElementByFragment=function(b){if(!this.inDocument_)throw Error(goog.ui.Component.Error.NOT_IN_DOCUMENT);return this.dom_.getElement(this.makeId(b))};a.addChild=function(b,c){this.addChildAt(b,this.getChildCount(),c)};
a.addChildAt=function(b,c,d){if(b.inDocument_&&(d||!this.inDocument_))throw Error(goog.ui.Component.Error.ALREADY_RENDERED);if(c<0||c>this.getChildCount())throw Error(goog.ui.Component.Error.CHILD_INDEX_OUT_OF_BOUNDS);if(!this.childIndex_||!this.children_){this.childIndex_={};this.children_=[]}if(b.getParent()==this){goog.object.set(this.childIndex_,b.getId(),b);goog.array.remove(this.children_,b)}else goog.object.add(this.childIndex_,b.getId(),b);b.setParent(this);goog.array.insertAt(this.children_,
b,c);if(b.inDocument_&&this.inDocument_&&b.getParent()==this){d=this.getContentElement();d.insertBefore(b.getElement(),d.childNodes[c]||null)}else if(d){this.element_||this.createDom();c=this.getChildAt(c+1);b.render_(this.getContentElement(),c?c.element_:null)}else this.inDocument_&&!b.inDocument_&&b.element_&&b.enterDocument()};a.getContentElement=function(){return this.element_};
a.isRightToLeft=function(){if(this.rightToLeft_==null)this.rightToLeft_=goog.style.isRightToLeft(this.inDocument_?this.element_:this.dom_.getDocument().body);return this.rightToLeft_};a.setRightToLeft=function(b){if(this.inDocument_)throw Error(goog.ui.Component.Error.ALREADY_RENDERED);this.rightToLeft_=b};a.hasChildren=function(){return!!this.children_&&this.children_.length!=0};a.getChildCount=function(){return this.children_?this.children_.length:0};
a.getChildIds=function(){var b=[];this.forEachChild(function(c){b.push(c.getId())});return b};a.getChild=function(b){return this.childIndex_&&b?goog.object.get(this.childIndex_,b)||null:null};a.getChildAt=function(b){return this.children_?this.children_[b]||null:null};a.forEachChild=function(b,c){this.children_&&goog.array.forEach(this.children_,b,c)};a.indexOfChild=function(b){return this.children_&&b?goog.array.indexOf(this.children_,b):-1};
a.removeChild=function(b,c){if(b){var d=goog.isString(b)?b:b.getId();b=this.getChild(d);if(d&&b){goog.object.remove(this.childIndex_,d);goog.array.remove(this.children_,b);if(c){b.exitDocument();b.element_&&goog.dom.removeNode(b.element_)}b.setParent(null)}}if(!b)throw Error(goog.ui.Component.Error.NOT_OUR_CHILD);return b};a.removeChildAt=function(b,c){return this.removeChild(this.getChildAt(b),c)};a.removeChildren=function(b){for(;this.hasChildren();)this.removeChildAt(0,b)};goog.ui.Dialog=function(b,c,d){goog.ui.Component.call(this,d);this.class_=b||"modal-dialog";this.useIframeMask_=!!c;this.buttons_=goog.ui.Dialog.ButtonSet.OK_CANCEL};goog.inherits(goog.ui.Dialog,goog.ui.Component);a=goog.ui.Dialog.prototype;a.focusHandler_=null;a.escapeToCancel_=true;a.hasTitleCloseButton_=true;a.useIframeMask_=false;a.modal_=true;a.draggable_=true;a.backgroundElementOpacity_=0.5;a.title_="";a.content_="";a.buttons_=null;a.dragger_=null;a.visible_=false;a.disposeOnHide_=false;
a.bgEl_=null;a.bgIframeEl_=null;a.titleEl_=null;a.titleTextEl_=null;a.titleId_=null;a.titleCloseEl_=null;a.contentEl_=null;a.buttonEl_=null;a.setTitle=function(b){this.title_=b;this.titleTextEl_&&goog.dom.setTextContent(this.titleTextEl_,b)};a.getTitle=function(){return this.title_};a.setContent=function(b){this.content_=b;if(this.contentEl_)this.contentEl_.innerHTML=b};a.getContent=function(){return this.content_};a.renderIfNoDom_=function(){this.getElement()||this.render()};
a.getContentElement=function(){this.renderIfNoDom_();return this.contentEl_};a.getTitleElement=function(){this.renderIfNoDom_();return this.titleEl_};a.getTitleTextElement=function(){this.renderIfNoDom_();return this.titleTextEl_};a.getTitleCloseElement=function(){this.renderIfNoDom_();return this.titleCloseEl_};a.getButtonElement=function(){this.renderIfNoDom_();return this.buttonEl_};a.getDialogElement=function(){this.renderIfNoDom_();return this.getElement()};
a.getBackgroundElement=function(){this.renderIfNoDom_();return this.bgEl_};a.getBackgroundElementOpacity=function(){return this.backgroundElementOpacity_};a.setBackgroundElementOpacity=function(b){this.backgroundElementOpacity_=b;this.bgEl_&&goog.style.setOpacity(this.bgEl_,this.backgroundElementOpacity_)};
a.setModal=function(b){this.modal_=b;this.manageBackgroundDom_();var c=this.getDomHelper();if(this.isInDocument()&&b&&this.isVisible()){this.bgIframeEl_&&c.insertSiblingBefore(this.bgIframeEl_,this.getElement());this.bgEl_&&c.insertSiblingBefore(this.bgEl_,this.getElement());this.resizeBackground_()}};a.getModal=function(){return this.modal_};a.getClass=function(){return this.class_};
a.setDraggable=function(b){if((this.draggable_=b)&&!this.dragger_&&this.getElement())this.dragger_=this.createDraggableTitleDom_();else if(!this.draggable_&&this.dragger_){this.getElement()&&goog.dom.classes.remove(this.titleEl_,this.class_+"-title-draggable");this.dragger_.dispose();this.dragger_=null}};a.createDraggableTitleDom_=function(){var b=new goog.fx.Dragger(this.getElement(),this.titleEl_);goog.dom.classes.add(this.titleEl_,this.class_+"-title-draggable");return b};a.getDraggable=function(){return this.draggable_};
a.createDom=function(){this.manageBackgroundDom_();var b=this.getDomHelper();this.setElementInternal(b.createDom("div",{className:this.class_,tabIndex:0},this.titleEl_=b.createDom("div",{className:this.class_+"-title",id:this.getId()},this.titleTextEl_=b.createDom("span",this.class_+"-title-text",this.title_),this.titleCloseEl_=b.createDom("span",this.class_+"-title-close")),this.contentEl_=b.createDom("div",this.class_+"-content"),this.buttonEl_=b.createDom("div",this.class_+"-buttons"),this.tabCatcherEl_=
b.createDom("span",{tabIndex:0})));this.titleId_=this.titleEl_.id;goog.dom.a11y.setRole(this.getElement(),"dialog");goog.dom.a11y.setState(this.getElement(),"labelledby",this.titleId_||"");if(this.content_)this.contentEl_.innerHTML=this.content_;goog.style.showElement(this.titleCloseEl_,this.hasTitleCloseButton_);goog.style.showElement(this.getElement(),false);this.buttons_&&this.buttons_.attachToElement(this.buttonEl_)};
a.manageBackgroundDom_=function(){if(this.useIframeMask_&&this.modal_&&!this.bgIframeEl_){this.bgIframeEl_=goog.dom.iframe.createBlank(this.getDomHelper());this.bgIframeEl_.className=this.class_+"-bg";goog.style.showElement(this.bgIframeEl_,false);goog.style.setOpacity(this.bgIframeEl_,0)}else if((!this.useIframeMask_||!this.modal_)&&this.bgIframeEl_){goog.dom.removeNode(this.bgIframeEl_);this.bgIframeEl_=null}if(this.modal_&&!this.bgEl_){this.bgEl_=this.getDomHelper().createDom("div",this.class_+
"-bg");goog.style.setOpacity(this.bgEl_,this.backgroundElementOpacity_);goog.style.showElement(this.bgEl_,false)}else if(!this.modal_&&this.bgEl_){goog.dom.removeNode(this.bgEl_);this.bgEl_=null}};a.render=function(b){if(this.isInDocument())throw Error(goog.ui.Component.Error.ALREADY_RENDERED);this.getElement()||this.createDom();b=b||this.getDomHelper().getDocument().body;this.renderBackground_(b);goog.ui.Dialog.superClass_.render.call(this,b)};
a.renderBackground_=function(b){this.bgIframeEl_&&b.appendChild(this.bgIframeEl_);this.bgEl_&&b.appendChild(this.bgEl_)};a.renderBefore=function(){throw Error(goog.ui.Component.Error.NOT_SUPPORTED);};a.canDecorate=function(b){return b&&b.tagName&&b.tagName=="DIV"&&goog.ui.Dialog.superClass_.canDecorate.call(this,b)};
a.decorateInternal=function(b){goog.ui.Dialog.superClass_.decorateInternal.call(this,b);goog.dom.classes.add(this.getElement(),this.class_);b=this.class_+"-content";if(this.contentEl_=goog.dom.getElementsByTagNameAndClass(null,b,this.getElement())[0])this.content_=this.contentEl_.innerHTML;else{this.contentEl_=this.getDomHelper().createDom("div",b);if(this.content_)this.contentEl_.innerHTML=this.content_;this.getElement().appendChild(this.contentEl_)}b=this.class_+"-title";var c=this.class_+"-title-text",
d=this.class_+"-title-close";if(this.titleEl_=goog.dom.getElementsByTagNameAndClass(null,b,this.getElement())[0]){this.titleTextEl_=goog.dom.getElementsByTagNameAndClass(null,c,this.titleEl_)[0];this.titleCloseEl_=goog.dom.getElementsByTagNameAndClass(null,d,this.titleEl_)[0]}else{this.titleEl_=this.getDomHelper().createDom("div",b);this.getElement().insertBefore(this.titleEl_,this.contentEl_)}if(this.titleTextEl_)this.title_=goog.dom.getTextContent(this.titleTextEl_);else{this.titleTextEl_=this.getDomHelper().createDom("span",
c,this.title_);this.titleEl_.appendChild(this.titleTextEl_)}goog.dom.a11y.setState(this.getElement(),"labelledby",this.titleId_||"");if(!this.titleCloseEl_){this.titleCloseEl_=this.getDomHelper().createDom("span",d);this.titleEl_.appendChild(this.titleCloseEl_)}goog.style.showElement(this.titleCloseEl_,this.hasTitleCloseButton_);b=this.class_+"-buttons";if(this.buttonEl_=goog.dom.getElementsByTagNameAndClass(null,b,this.getElement())[0]){this.buttons_=new goog.ui.Dialog.ButtonSet(this.getDomHelper());
this.buttons_.decorate(this.buttonEl_)}else{this.buttonEl_=this.getDomHelper().createDom("div",b);this.getElement().appendChild(this.buttonEl_);this.buttons_&&this.buttons_.attachToElement(this.buttonEl_)}this.manageBackgroundDom_();this.renderBackground_(goog.dom.getOwnerDocument(this.getElement()).body);goog.style.showElement(this.getElement(),false)};
a.enterDocument=function(){goog.ui.Dialog.superClass_.enterDocument.call(this);this.focusHandler_=new goog.events.FocusHandler(this.getDomHelper().getDocument());if(this.draggable_&&!this.dragger_)this.dragger_=this.createDraggableTitleDom_();this.getHandler().listen(this.titleCloseEl_,goog.events.EventType.CLICK,this.onTitleCloseClick_).listen(this.focusHandler_,goog.events.FocusHandler.EventType.FOCUSIN,this.onFocus_);goog.dom.a11y.setRole(this.getElement(),"dialog");this.titleTextEl_.id!==""&&
goog.dom.a11y.setState(this.getElement(),"labelledby",this.titleTextEl_.id)};a.exitDocument=function(){this.isVisible()&&this.setVisible(false);this.focusHandler_.dispose();this.focusHandler_=null;if(this.dragger_){this.dragger_.dispose();this.dragger_=null}goog.ui.Dialog.superClass_.exitDocument.call(this)};
a.setVisible=function(b){if(b!=this.visible_){var c=this.getDomHelper().getDocument(),d=goog.dom.getWindow(c)||window;this.isInDocument()||this.render(c.body);if(b){this.resizeBackground_();this.reposition();this.getHandler().listen(this.getElement(),goog.events.EventType.KEYDOWN,this.onKey_,true).listen(this.getElement(),goog.events.EventType.KEYPRESS,this.onKey_,true).listen(d,goog.events.EventType.RESIZE,this.onResize_,true)}else this.getHandler().unlisten(this.getElement(),goog.events.EventType.KEYDOWN,
this.onKey_,true).unlisten(this.getElement(),goog.events.EventType.KEYPRESS,this.onKey_,true).unlisten(d,goog.events.EventType.RESIZE,this.onResize_,true);this.bgIframeEl_&&goog.style.showElement(this.bgIframeEl_,b);this.bgEl_&&goog.style.showElement(this.bgEl_,b);goog.style.showElement(this.getElement(),b);b&&this.focus();if(this.visible_=b)this.getHandler().listen(this.buttonEl_,goog.events.EventType.CLICK,this.onButtonClick_);else{this.getHandler().unlisten(this.buttonEl_,goog.events.EventType.CLICK,
this.onButtonClick_);this.dispatchEvent(goog.ui.Dialog.EventType.AFTER_HIDE);this.disposeOnHide_&&this.dispose()}}};a.isVisible=function(){return this.visible_};
a.focus=function(){try{this.getElement().focus()}catch(b){}if(this.getButtonSet()){var c=this.getButtonSet().getDefault();if(c)for(var d=this.getDomHelper().getDocument(),e=this.buttonEl_.getElementsByTagName("button"),f=0,g;g=e[f];f++)if(g.name==c){try{if(goog.userAgent.WEBKIT||goog.userAgent.OPERA){var h=d.createElement("input");h.style.cssText="position:fixed;width:0;height:0;left:0;top:0;";this.getElement().appendChild(h);h.focus();this.getElement().removeChild(h)}g.focus()}catch(i){}break}}};
a.resizeBackground_=function(){this.bgIframeEl_&&goog.style.showElement(this.bgIframeEl_,false);this.bgEl_&&goog.style.showElement(this.bgEl_,false);var b=this.getDomHelper().getDocument(),c=goog.dom.getWindow(b)||window,d=goog.dom.getViewportSize(c);c=Math.max(b.body.scrollWidth,d.width);b=Math.max(b.body.scrollHeight,d.height);if(this.bgIframeEl_){goog.style.showElement(this.bgIframeEl_,true);goog.style.setSize(this.bgIframeEl_,c,b)}if(this.bgEl_){goog.style.showElement(this.bgEl_,true);goog.style.setSize(this.bgEl_,
c,b)}if(this.draggable_){d=goog.style.getSize(this.getElement());this.dragger_.limits=new goog.math.Rect(0,0,c-d.width,b-d.height)}};
a.reposition=function(){var b=this.getDomHelper().getDocument(),c=goog.dom.getWindow(b)||window;if(goog.style.getComputedPosition(this.getElement())=="fixed")var d=b=0;else{d=this.getDomHelper().getDocumentScroll();b=d.x;d=d.y}var e=goog.style.getSize(this.getElement());c=goog.dom.getViewportSize(c);b=Math.max(b+c.width/2-e.width/2,0);d=Math.max(d+c.height/2-e.height/2,0);goog.style.setPosition(this.getElement(),b,d)};
a.onTitleCloseClick_=function(){if(this.hasTitleCloseButton_){var b=this.getButtonSet(),c=b&&b.getCancel();if(c){b=b.get(c);this.dispatchEvent(new goog.ui.Dialog.Event(c,b))&&this.setVisible(false)}else this.setVisible(false)}};a.getHasTitleCloseButton=function(){return this.hasTitleCloseButton_};a.setHasTitleCloseButton=function(b){this.hasTitleCloseButton_=b;this.titleCloseEl_&&goog.style.showElement(this.titleCloseEl_,this.hasTitleCloseButton_)};a.isEscapeToCancel=function(){return this.escapeToCancel_};
a.setEscapeToCancel=function(b){this.escapeToCancel_=b};a.setDisposeOnHide=function(b){this.disposeOnHide_=b};a.getDisposeOnHide=function(){return this.disposeOnHide_};a.disposeInternal=function(){goog.ui.Dialog.superClass_.disposeInternal.call(this);if(this.bgEl_){goog.dom.removeNode(this.bgEl_);this.bgEl_=null}if(this.bgIframeEl_){goog.dom.removeNode(this.bgIframeEl_);this.bgIframeEl_=null}this.tabCatcherEl_=this.buttonEl_=this.titleCloseEl_=null};
a.setButtonSet=function(b){this.buttons_=b;if(this.buttonEl_)if(this.buttons_)this.buttons_.attachToElement(this.buttonEl_);else this.buttonEl_.innerHTML=""};a.getButtonSet=function(){return this.buttons_};a.onButtonClick_=function(b){if((b=this.findParentButton_(b.target))&&!b.disabled){b=b.name;var c=this.getButtonSet().get(b);this.dispatchEvent(new goog.ui.Dialog.Event(b,c))&&this.setVisible(false)}};
a.findParentButton_=function(b){for(b=b;b!=null&&b!=this.buttonEl_;){if(b.tagName=="BUTTON")return b;b=b.parentNode}return null};
a.onKey_=function(b){var c=false,d=false,e=this.getButtonSet(),f=b.target;if(b.type==goog.events.EventType.KEYDOWN)if(this.escapeToCancel_&&b.keyCode==goog.events.KeyCodes.ESC){var g=e&&e.getCancel();f=f.tagName=="SELECT"&&!f.disabled;if(g&&!f){d=true;c=e.get(g);c=this.dispatchEvent(new goog.ui.Dialog.Event(g,c))}else f||(c=true)}else{if(b.keyCode==goog.events.KeyCodes.TAB&&b.shiftKey&&f==this.getElement())d=true}else if(b.keyCode==goog.events.KeyCodes.ENTER){if(f.tagName=="BUTTON")g=f.name;else if(e){var h=
e.getDefault(),i=h&&e.getButton(h);f=(f.tagName=="TEXTAREA"||f.tagName=="SELECT")&&!f.disabled;if(i&&!i.disabled&&!f)g=h}if(g){d=true;c=this.dispatchEvent(new goog.ui.Dialog.Event(g,String(e.get(g))))}}if(c||d){b.stopPropagation();b.preventDefault()}c&&this.setVisible(false)};a.onResize_=function(){this.resizeBackground_()};a.onFocus_=function(b){this.tabCatcherEl_==b.target&&goog.Timer.callOnce(this.focusElement_,0,this)};
a.focusElement_=function(){goog.userAgent.IE&&this.getDomHelper().getDocument().body.focus();this.getElement().focus()};goog.ui.Dialog.Event=function(b,c){this.type=goog.ui.Dialog.EventType.SELECT;this.key=b;this.caption=c};goog.inherits(goog.ui.Dialog.Event,goog.events.Event);goog.ui.Dialog.SELECT_EVENT="dialogselect";goog.ui.Dialog.EventType={SELECT:"dialogselect",AFTER_HIDE:"afterhide"};goog.ui.Dialog.ButtonSet=function(b){this.dom_=b||goog.dom.getDomHelper();goog.structs.Map.call(this)};
goog.inherits(goog.ui.Dialog.ButtonSet,goog.structs.Map);a=goog.ui.Dialog.ButtonSet.prototype;a.class_="goog-buttonset";a.defaultButton_=null;a.element_=null;a.cancelButton_=null;a.set=function(b,c,d,e){goog.structs.Map.prototype.set.call(this,b,c);if(d)this.defaultButton_=b;if(e)this.cancelButton_=b;return this};a.attachToElement=function(b){this.element_=b;this.render()};
a.render=function(){if(this.element_){this.element_.innerHTML="";var b=goog.dom.getDomHelper(this.element_);goog.structs.forEach(this,function(c,d){c=b.createDom("button",{name:d},c);if(d==this.defaultButton_)c.className=this.class_+"-default";this.element_.appendChild(c)},this)}};
a.decorate=function(b){if(!(!b||b.nodeType!=goog.dom.NodeType.ELEMENT)){this.element_=b;b=this.element_.getElementsByTagName("button");for(var c=0,d,e,f;d=b[c];c++){e=d.name||d.id;f=goog.dom.getTextContent(d)||d.value;if(e){var g=c==0,h=d.name==goog.ui.Dialog.DefaultButtonKeys.CANCEL;this.set(e,f,g,h);g&&goog.dom.classes.add(d,this.class_+"-default")}}}};a.setDefault=function(b){this.defaultButton_=b};a.getDefault=function(){return this.defaultButton_};a.setCancel=function(b){this.cancelButton_=b};
a.getCancel=function(){return this.cancelButton_};a.getButton=function(b){for(var c=this.getAllButtons(),d=0,e;e=c[d];d++)if(e.name==b||e.id==b)return e;return null};a.getAllButtons=function(){return this.element_.getElementsByTagName(goog.dom.TagName.BUTTON)};goog.ui.Dialog.DefaultButtonKeys={OK:"ok",CANCEL:"cancel",YES:"yes",NO:"no",SAVE:"save",CONTINUE:"continue"};
(function(){var b=goog.getMsg("OK"),c=goog.getMsg("Cancel"),d=goog.getMsg("Yes"),e=goog.getMsg("No"),f=goog.getMsg("Save"),g=goog.getMsg("Continue");goog.ui.Dialog.ButtonSet.OK=(new goog.ui.Dialog.ButtonSet).set(goog.ui.Dialog.DefaultButtonKeys.OK,b,true,true);goog.ui.Dialog.ButtonSet.OK_CANCEL=(new goog.ui.Dialog.ButtonSet).set(goog.ui.Dialog.DefaultButtonKeys.OK,b,true).set(goog.ui.Dialog.DefaultButtonKeys.CANCEL,c,false,true);goog.ui.Dialog.ButtonSet.YES_NO=(new goog.ui.Dialog.ButtonSet).set(goog.ui.Dialog.DefaultButtonKeys.YES,
d,true).set(goog.ui.Dialog.DefaultButtonKeys.NO,e,false,true);goog.ui.Dialog.ButtonSet.YES_NO_CANCEL=(new goog.ui.Dialog.ButtonSet).set(goog.ui.Dialog.DefaultButtonKeys.YES,d).set(goog.ui.Dialog.DefaultButtonKeys.NO,e,true).set(goog.ui.Dialog.DefaultButtonKeys.CANCEL,c,false,true);goog.ui.Dialog.ButtonSet.CONTINUE_SAVE_CANCEL=(new goog.ui.Dialog.ButtonSet).set(goog.ui.Dialog.DefaultButtonKeys.CONTINUE,g).set(goog.ui.Dialog.DefaultButtonKeys.SAVE,f).set(goog.ui.Dialog.DefaultButtonKeys.CANCEL,c,true,
true)})();

// Storing in its own file as calcdeps only operates on standalone JS files.

// From slideset.js
goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.fx.DragListGroup');
goog.require('goog.fx.DragListDirection');
goog.require('goog.events.Event');
goog.require('goog.net.XhrIo');

// From slideset_edit.html
goog.require('goog.ui.Dialog');
goog.require('goog.net.XhrIo');

goog.require('goog.dom');
goog.require('goog.net');
goog.require('goog.style');
goog.require('goog.fx.DragListGroup');
goog.require('goog.fx.DragListDirection');
goog.require('goog.events.Event');
goog.require('goog.net.XhrIo');

// A single slide. We know how to draw ourselves in the DOM and support the
// dragging/reordering operations on slides.
function Slide(setKey, key, type, title, subtitle, content) {
  this.setKey_ = setKey;
  this.key_ = key;
  this.type_ = type; 
  this.title_ = title;
  this.subtitle_ = subtitle || '';
  this.content_ = content.replace(/NEWLINE/g, '\n') || '';
}

Slide.TYPE_INTRO = 'intro';
Slide.TYPE_SECTION = 'section';
Slide.TYPE_NORMAL = 'normal';

// Returns this slide's datastore key.
Slide.prototype.key = function() {
  return this.key_;
}

// Parses a list of slides of the form:
//
//   [[setKey, key, description, completed]*]
//
// Specifically, the list should be an array of arrays representing arguments
// to the Slide constructor.
Slide.parseList = function(list) {
  var result = [];
  function wrapper() {}
  wrapper.prototype = Slide.prototype;
  for (var i = 0; i < list.length; i++) {
    var slide = new wrapper();
    Slide.apply(slide, list[i]);
    result.push(slide);
  }
  return result;
}

// Attaches this slide to the given element container, creating the DOM
// elements representing this slide.
Slide.prototype.attachToDOM = function(container) {
  var element = this.createElement_('div', container, 'slide');
  element.style.position = 'relative';

  var typeImg = this.createElement_('img', element);
  typeImg.style.cursor = 'move';
  typeImg.alt = 'Drag to reorder slides';
  typeImg.src = '/static/images/type_' + this.type_ + '.png';

  goog.events.listen(typeImg, goog.events.EventType.CLICK, function() {
    /*
    var centerArea = document.getElementById('centertable');
    
    this.titleContainer_ = this.createElement_('input', centerArea);
    this.titleContainer_.style.position = 'relative';
    this.titleContainer_.value = this.title_ || '';
    goog.events.listen(this.titleContainer_, goog.events.EventType.KEYPRESS, goog.bind(this.onEditKeyPress_, this));
    goog.events.listen(this.titleContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
    goog.events.listen(this.titleContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);

     // Make subtitle cell
    this.subtitleContainer_ = this.createElement_('input', centerArea);
    if (this.type_ != Slide.TYPE_INTRO) this.subtitleContainer_.disabled = true;
    goog.events.listen(this.subtitleContainer_, goog.events.EventType.KEYPRESS, goog.bind(this.onEditKeyPress_, this));
    goog.events.listen(this.subtitleContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
    goog.events.listen(this.subtitleContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);
    this.subtitleContainer_.value = this.subtitle_ || '';

    // Make content input
    this.contentContainer_ = this.createElement_('textarea', centerArea);
    this.contentContainer_.style.width = '60%';
    if (this.type_ != Slide.TYPE_NORMAL) this.contentContainer_.disabled = true;
    goog.events.listen(this.contentContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
    goog.events.listen(this.contentContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);
    this.contentContainer_.value = this.content_ || '';
    this.contentContainer_.style.height = this.contentContainer_.scrollHeight + 'px';
    goog.style.setUnselectable(element, false);
    */
  });
  
  this.element_ = element;
  return element;
}

// Check for Return/Escape key press events to stop editing. We save the
// edit on Return, cancel the edit on escape.
Slide.prototype.onEditKeyPress_ = function(e) {
  if (e.keyCode == 13) {
    goog.events.Event.stopPropagation(e);
    this.saveEdit_();
  } else if (e.keyCode == 27) {
    goog.events.Event.stopPropagation(e);
    this.cleanUpEdit_();
  }
}

// Save the results of this edit to the server.
Slide.prototype.saveEdit_ = function() {
  var titleChanged = this.titleContainer_.value != this.title_;
  if (titleChanged) this.title_ = this.titleContainer_.value;
  var subtitleChanged = this.subtitleContainer_ && this.subtitleContainer_.value != this.subtitle_;
  if (subtitleChanged) this.subtitle_ = this.subtitleContainer_.value;
  var contentChanged = this.contentContainer_ && this.contentContainer_.value != this.content_;
  if (contentChanged) this.content_ = this.contentContainer_.value;
  var changed = contentChanged || subtitleChanged || titleChanged;

  if (changed) {
    this.save();
  }
}

// Saves this slide to the datastore on the server with an AJAX request.
Slide.prototype.save = function() {
  // Find index by figuring out which element it is beneath its parent
  var parentNode = this.element_.parentNode;
  for (var child = parentNode.firstChild, i = 0; child != null; child = child.nextSibling, i++) {
    if (child.slide && child == this.element_) {
      // Index is 1-based
      index = i + 1;
    }
  }

  var args = [
      'set=' + encodeURIComponent(this.setKey_),
      'type=' + encodeURIComponent(this.type_),
      'title=' + encodeURIComponent(this.title_),
      'subtitle=' + encodeURIComponent(this.subtitle_),
      'content=' + encodeURIComponent(this.content_),
      'index=' + index
  ];
  if (this.key_) {
    args.push('slide=' + encodeURIComponent(this.key_));
  }
  goog.net.XhrIo.send('/editslide.do',
    goog.bind(this.onSave_, this),
    'POST',
    args.join('&')
  );
}

// Called when the save slide AJAX request finishes.
Slide.prototype.onSave_ = function(e) {
  var xhrio = e.target;
  if (xhrio.isSuccess()) {
    this.key_ = xhrio.getResponseText();
    this.checkbox.value = this.key_;
  }
}

// Creates a DOM element with the given name, parent, and class name.
Slide.prototype.createElement_ = function(name, opt_parent, opt_className) {
  var element = document.createElement(name);
  if (opt_className) {
    element.className = opt_className;
  }
  if (opt_parent) {
    opt_parent.appendChild(element);
  }
  return element;
}

// A slide list, which is just a collection of slides.
function SlideSet(key, slides) {
  this.key_ = key;
  this.slides_ = slides;
}

// Draws this slide list in the given container.
SlideSet.prototype.attachToDOM = function(container) {
  var element = document.createElement('div');
  element.className = 'slidelist';
  element.style.position = 'relative';
  container.appendChild(element);
  this.element_ = element;
  var order = [];
  for (var i = 0; i < this.slides_.length; i++) {
    var slide = this.slides_[i];
    order.push(slide.key());
    var slideElement = slide.attachToDOM(element);
    slideElement.slide = slide;
  }
  this.order_ = order;
  this.makeDraggable_();
};

SlideSet.prototype.makeDraggable_ = function() {
  var me = this;
  if (this.dlg_) this.dlg_.disposeInternal();

  var dlg = new goog.fx.DragListGroup();
  dlg.addDragList(this.element_, goog.fx.DragListDirection.DOWN);
  dlg.setFunctionToGetHandleForDragItem(function(dragItem) {
    return dragItem.getElementsByTagName('img')[0]; });
  goog.events.listen(dlg, goog.fx.DragListGroup.EventType.DRAGEND, function() {
    me.savePositions_();
  });

  dlg.init();
  this.dlg_ = dlg;
}

// Serializes the order of all of the slides in this list to the server so
// the order will be preserved on refresh.
SlideSet.prototype.savePositions_ = function() {
  // Determine the slide order based on the positions of the DIVs
  var order = [];
  for (var child = this.element_.firstChild; child != null; child = child.nextSibling) {
    if (child.slide) {
      order.push(child.slide.key());
    }
  }

  // Only save the order to the server if it has changed
  var changed = false;
  for (var i = 0; i < order.length; i++) {
    if (order[i] != this.order_[i]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  this.order_ = order;

  // Save the order to the server
  var body = 'slides=' + encodeURIComponent(order.join(','));
  goog.net.XhrIo.send('/setslidepositions.do', null, 'POST', body);
}

SlideSet.prototype.changeTheme = function(theme) {
  var body = 'theme=' + theme + '&id=' + this.key_;
  goog.net.XhrIo.send('/changetheme.do', null, 'POST', body);
}

// Creates a new slide in this list
SlideSet.prototype.newSlide = function(type) {
  var slide = new Slide(this.key_, null, type, '', '', '');
  this.slides_.push(slide);
  var slideElement = slide.attachToDOM(this.element_);
  slideElement.slide = slide;
  this.makeDraggable_();
}

// A single slide. We know how to draw ourselves in the DOM and support the
// dragging/reordering operations on slides.
function Slide(setKey, key, type, title, subtitle, content) {
  this.setKey_ = setKey;
  this.key_ = key;
  this.type_ = type; 
  this.title_ = title;
  this.subtitle_ = subtitle || '';
  this.content_ = content.replace(/NEWLINE/g, '\n') || '';
}

Slide.TYPE_INTRO = 'intro';
Slide.TYPE_SECTION = 'section';
Slide.TYPE_NORMAL = 'normal';

// Returns this slide's datastore key.
Slide.prototype.key = function() {
  return this.key_;
}

// Parses a list of slides of the form:
//
//   [[setKey, key, description, completed]*]
//
// Specifically, the list should be an array of arrays representing arguments
// to the Slide constructor.
Slide.parseList = function(list) {
  var result = [];
  function wrapper() {}
  wrapper.prototype = Slide.prototype;
  for (var i = 0; i < list.length; i++) {
    var slide = new wrapper();
    Slide.apply(slide, list[i]);
    result.push(slide);
  }
  return result;
}

// Attaches this slide to the given element container, creating the DOM
// elements representing this slide.
Slide.prototype.attachToDOM = function(container) {
  var element = this.createElement_('div', container, 'slide');
  element.style.position = 'relative';

  var typeImg = this.createElement_('img', element);
  typeImg.style.cursor = 'move';
  typeImg.style.width = '40px';
  typeImg.style.verticalAlign = 'middle';
  typeImg.style.marginRight = '10px';
  typeImg.alt = 'Drag to reorder slides';
  typeImg.src = '/editor/img/type_' + this.type_ + '.png';
  
  var header = this.createElement_('label', element);
  header.style.fontWeight = 'bold';
  header.style.cursor = 'pointer';
  header.className = 'slidelabel';
  header.innerHTML = (this.title_ != '') ? this.title_ : '(Untitled)';
  this.sidebarTitle_ = header;
  
  var hiddenInput = this.createElement_('input', element);
  hiddenInput.type = 'radio';
  hiddenInput.value = this.key_;
  hiddenInput.name = 'slide';
  hiddenInput.checked = false;
  hiddenInput.style.display = 'none';
  this.hiddenInput_ = hiddenInput;
  
  goog.events.listen(header, goog.events.EventType.CLICK, this.showSlide, false, this);
  //goog.style.setUnselectable(element, false);
  this.element_ = element;
  return element;
}

Slide.prototype.showSlide = function(e) {
  if (e && e.target.nodeName != 'LABEL') return;
  var labels = goog.dom.getElementsByClass('slidelabel');
  for (var i = 0; i < labels.length; i++) {
    labels[i].style.textDecoration = 'none';
  }
  this.sidebarTitle_.style.textDecoration = 'underline';
  this.hiddenInput_.checked = true;
  
  var centerArea = document.getElementById('slideeditor');
  centerArea.innerHTML = '';
  
  this.titleLabel_ = this.createElement_('label', centerArea);
  this.titleLabel_.innerHTML = 'Title: ';
  this.titleContainer_ = this.createElement_('input', centerArea);
  this.titleContainer_.style.position = 'relative';
  this.titleContainer_.value = this.title_ || '';

  goog.events.listen(this.titleContainer_, goog.events.EventType.KEYUP, goog.bind(this.updatePreview_, this));
  goog.events.listen(this.titleContainer_, goog.events.EventType.KEYPRESS, goog.bind(this.onEditKeyPress_, this));
  goog.events.listen(this.titleContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
  goog.events.listen(this.titleContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);

   // Make subtitle cell
   if (this.type_ == Slide.TYPE_INTRO) {
    this.subtitleLabel_ = this.createElement_('label', centerArea);
    this.subtitleLabel_.innerHTML = '&nbsp;Subtitle: ';
    this.subtitleContainer_ = this.createElement_('input', centerArea);
    goog.events.listen(this.subtitleContainer_, goog.events.EventType.KEYUP, goog.bind(this.updatePreview_, this));
    goog.events.listen(this.subtitleContainer_, goog.events.EventType.KEYPRESS, goog.bind(this.onEditKeyPress_, this));
    goog.events.listen(this.subtitleContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
    goog.events.listen(this.subtitleContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);
    this.subtitleContainer_.value = this.subtitle_ || '';
  }
  // Make content input
  if (this.type_ == Slide.TYPE_NORMAL) {
   
    this.contentContainer_ = this.createElement_('textarea', centerArea);
    this.contentContainer_.style.width = '100%';
    goog.events.listen(this.contentContainer_, goog.events.EventType.KEYUP, goog.bind(this.updatePreview_, this));
    goog.events.listen(this.contentContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
    goog.events.listen(this.contentContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);
    this.contentContainer_.value = this.content_ || '';
    this.contentContainer_.style.height = Math.min(this.contentContainer_.scrollHeight, document.getElementById('container').clientHeight/3) + 'px';
    
  }
  this.updatePreview_();
}

Slide.prototype.updatePreview_ = function() {
  document.getElementById('previewtitle').innerHTML = this.titleContainer_.value;
  if (this.titleContainer_.value != '') {
    this.sidebarTitle_.innerHTML = this.titleContainer_.value;
  }
  if (this.subtitleContainer_) {
    document.getElementById('previewsubtitle').innerHTML = this.subtitleContainer_.value;
  } else {
    document.getElementById('previewsubtitle').innerHTML = '';
  }
  if (this.contentContainer_) {
    document.getElementById('previewcontent').innerHTML = this.contentContainer_.value;
  } else {
    document.getElementById('previewcontent').innerHTML = '';
  }
}


// Check for Return/Escape key press events to stop editing. We save the
// edit on Return, cancel the edit on escape.
Slide.prototype.onEditKeyPress_ = function(e) {
  if (e.keyCode == 13) {
    goog.events.Event.stopPropagation(e);
    this.saveEdit_();
  } else if (e.keyCode == 27) {
    goog.events.Event.stopPropagation(e);
    this.cleanUpEdit_();
  }
}

// Save the results of this edit to the server.
Slide.prototype.saveEdit_ = function() {
  var titleChanged = this.titleContainer_.value != this.title_;
  if (titleChanged) this.title_ = this.titleContainer_.value;
  var subtitleChanged = this.subtitleContainer_ && this.subtitleContainer_.value != this.subtitle_;
  if (subtitleChanged) this.subtitle_ = this.subtitleContainer_.value;
  var contentChanged = this.contentContainer_ && this.contentContainer_.value != this.content_;
  if (contentChanged) this.content_ = this.contentContainer_.value;
  var changed = contentChanged || subtitleChanged || titleChanged;

  if (changed) {
    this.save();
  }
}

// Saves this slide to the datastore on the server with an AJAX request.
Slide.prototype.save = function() {
  if (this.key_ == 'pending') {
    window.setTimeout(this.save(), 2000);
    return;
  }
  
  // Find index by figuring out which element it is beneath its parent
  var parentNode = this.element_.parentNode;
  for (var child = parentNode.firstChild, i = 0; child != null; child = child.nextSibling, i++) {
    if (child.slide && child == this.element_) {
      // Index is 1-based
      index = i + 1;
    }
  }

  var args = [
      'set=' + encodeURIComponent(this.setKey_),
      'type=' + encodeURIComponent(this.type_),
      'title=' + encodeURIComponent(this.title_),
      'subtitle=' + encodeURIComponent(this.subtitle_),
      'content=' + encodeURIComponent(this.content_),
      'index=' + index
  ];
  if (this.key_) {
    args.push('slide=' + encodeURIComponent(this.key_));
  } else {
    // To mark the first save of a slide so we don't save twice without a key
    this.key_ = 'pending';
  }
  goog.net.XhrIo.send('/editslide.do',
    goog.bind(this.onSave_, this),
    'POST',
    args.join('&')
  );
}

// Called when the save slide AJAX request finishes.
Slide.prototype.onSave_ = function(e) {
  var xhrio = e.target;
  if (xhrio.isSuccess()) {
    this.key_ = xhrio.getResponseText();
    this.hiddenInput_.value = this.key_;
  }
}

// Creates a DOM element with the given name, parent, and class name.
Slide.prototype.createElement_ = function(name, opt_parent, opt_className) {
  var element = document.createElement(name);
  if (opt_className) {
    element.className = opt_className;
  }
  if (opt_parent) {
    opt_parent.appendChild(element);
  }
  return element;
}

// A slide list, which is just a collection of slides.
function SlideSet(key, slides) {
  this.key_ = key;
  this.slides_ = slides;
}

// Draws this slide list in the given container.
SlideSet.prototype.attachToDOM = function(container) {
  var element = document.createElement('div');
  element.className = 'slidelist';
  element.style.position = 'relative';
  container.appendChild(element);
  this.element_ = element;
  var order = [];
  for (var i = 0; i < this.slides_.length; i++) {
    var slide = this.slides_[i];
    order.push(slide.key());
    var slideElement = slide.attachToDOM(element);
    slideElement.slide = slide;
  }
  this.order_ = order;
  this.makeDraggable_();
};

SlideSet.prototype.makeDraggable_ = function() {
  var me = this;
  if (this.dlg_) this.dlg_.disposeInternal();

  var dlg = new goog.fx.DragListGroup();
  dlg.addDragList(this.element_, goog.fx.DragListDirection.DOWN);
  dlg.setFunctionToGetHandleForDragItem(function(dragItem) {
    return dragItem.getElementsByTagName('img')[0]; });
  goog.events.listen(dlg, goog.fx.DragListGroup.EventType.DRAGEND, function() {
    me.savePositions_();
  });

  dlg.init();
  this.dlg_ = dlg;
}

// Serializes the order of all of the slides in this list to the server so
// the order will be preserved on refresh.
SlideSet.prototype.savePositions_ = function() {
  // Determine the slide order based on the positions of the DIVs
  var order = [];
  for (var child = this.element_.firstChild; child != null; child = child.nextSibling) {
    if (child.slide) {
      order.push(child.slide.key());
    }
  }

  // Only save the order to the server if it has changed
  var changed = false;
  for (var i = 0; i < order.length; i++) {
    if (order[i] != this.order_[i]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  this.order_ = order;

  // Save the order to the server
  var body = 'slides=' + encodeURIComponent(order.join(','));
  goog.net.XhrIo.send('/setslidepositions.do', null, 'POST', body);
}

SlideSet.prototype.changeTheme = function(theme) {
  var body = 'theme=' + theme + '&id=' + this.key_;
  goog.net.XhrIo.send('/changetheme.do', null, 'POST', body);
}

// Creates a new slide in this list
SlideSet.prototype.newSlide = function(type) {
  var slide = new Slide(this.key_, null, type, '', '', '');
  this.slides_.push(slide);
  var slideElement = slide.attachToDOM(this.element_);
  slideElement.slide = slide;
  slide.showSlide();
  this.makeDraggable_();
}

SlideSet.prototype.doPublish = function(publish) {
  // Disable all the publish buttons as we make the request
  $('.button-publish').hide();

  // Make the request
  var body = "id=" + this.key_;
  if (publish) {
    body += "&publish=1";
  }

  goog.net.XhrIo.send('/publishslideset.do', function() {
    if (publish) {
      $('#button-publish').show();
    } else {
      $('#button-unpublish').show();
    }
    $('.button-publish').removeAttr('disabled');
  },
   'POST', body);
}


/*
function resizeSlideArea() {

  function findPos(obj) {
    var curtop = 0;
    if (obj.offsetParent) {
     do {
        curtop += obj.offsetTop;
      } while (obj = obj.offsetParent);
    }
    return curtop;
  }

  var minus = findPos(document.getElementById('slidemain')) + 10;

  if (window.innerHeight) {
    var height = window.innerHeight - minus;
  } else {
    var height = document.documentElement.offsetHeight - minus;
  }
  document.getElementById('slidemain').style.height = height + 'px';
  document.getElementById('container').style.height = height + 'px';
}

goog.events.listen(window, goog.events.EventType.RESIZE, resizeSlideArea);
resizeSlideArea();
*/
