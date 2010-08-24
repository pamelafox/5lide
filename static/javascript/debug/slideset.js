// Copyright 2007 Google Inc.
// All Rights Reserved
//
// Author: Bret Taylor

// A single slide. We know how to draw ourselves in the DOM and support the
// dragging/reordering operations on slides.
function Slide(setKey, key, type, title, subtitle, content) {
  this.setKey_ = setKey;
  this.key_ = key;
  this.type_ = type; 
  this.title_ = title;
  this.subtitle_ = subtitle || '';
  this.content_ = content || '';
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
  var element = this.createElement_("div", container, "slide");
  element.style.position = "relative";

  var table = this.createElement_("table", element);
  var tbody = this.createElement_("tbody", table);
  var tr = this.createElement_("tr", tbody);

  var typeCell = this.createElement_("td", tr, "typecol");
  var typeImg = this.createElement_("img", typeCell);
  typeImg.src = "/static/images/type_" + this.type_ + ".png";

  var titleCell = this.createElement_("td", tr, "titlecol");
  this.titleContainer_ = this.createElement_("input", titleCell);
  this.titleContainer_.style.position = "relative";
  this.titleContainer_.value = this.title_ || "";
  Event.addListener(this.titleContainer_, "keypress", callback(this, this.onEditKeyPress_));
  Event.addListener(this.titleContainer_, "blur", callback(this, this.saveEdit_));
  Event.addListener(this.titleContainer_, "mousedown", stopEvent);

   // Make subtitle cell
  var subtitleCell = this.createElement_("td", tr, "subtitlecol");
  this.subtitleContainer_ = this.createElement_("input", subtitleCell);
  if (this.type_ != Slide.TYPE_INTRO) this.subtitleContainer_.disabled = true;
  Event.addListener(this.subtitleContainer_, "keypress", callback(this, this.onEditKeyPress_));
  Event.addListener(this.subtitleContainer_, "blur", callback(this, this.saveEdit_));
  Event.addListener(this.subtitleContainer_, "mousedown", stopEvent);
  this.subtitleContainer_.value = this.subtitle_ || "";

  // Make content input
  var contentCell = this.createElement_("td", tr, "contentcol");
  this.contentContainer_ = this.createElement_("textarea", contentCell);
  this.contentContainer_.style.width = "60%";
  if (this.type_ != Slide.TYPE_NORMAL) this.contentContainer_.disabled = true;
  Event.addListener(this.contentContainer_, "blur", callback(this, this.saveEdit_));
  Event.addListener(this.contentContainer_, "mousedown", stopEvent);
  this.contentContainer_.value = this.content_ || "";


  // Enable drag positioning of this slide
  var dragger = new Dragger(element, true);
  Event.addListener(dragger, "dragstart", callback(this, this.onDragStart_));
  Event.addListener(dragger, "dragend", callback(this, this.onDragEnd_));
  Event.addListener(dragger, "drag", callback(this, this.onDrag_));
  Event.addListener(dragger, "click", callback(this, this.edit));

  this.element_ = element;
  enableSelection(this.element_);
  return element;
}

// Check for Return/Escape key press events to stop editing. We save the
// edit on Return, cancel the edit on escape.
Slide.prototype.onEditKeyPress_ = function(e) {
  if (e.keyCode == 13) {
    cancelEvent(e);
    this.saveEdit_();
  } else if (e.keyCode == 27) {
    cancelEvent(e);
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
  var args = [
      "set=" + encodeURIComponent(this.setKey_),
      "type=" + encodeURIComponent(this.type_),
      "title=" + encodeURIComponent(this.title_),
      "subtitle=" + encodeURIComponent(this.subtitle_),
      "content=" + encodeURIComponent(this.content_)
  ];
  if (this.key_) {
    args.push("slide=" + encodeURIComponent(this.key_));
  }
  download("/editslide.do", callback(this, this.onSave_), {
    post: true,
    body: args.join("&")
  });
}

// Called when the save slide AJAX request finishes.
Slide.prototype.onSave_ = function(text, status) {
  if (status >= 200 && status < 300) {
    this.key_ = text;
  }
}

// Let the user drag this slide up and down. We remove our element from the
// DOM and replace it with a placeholder so the user can see where the
// slide will snap into place when it is dropped.
Slide.prototype.onDragStart_ = function() {
  var placeholder = document.createElement("div");
  placeholder.style.width = this.element_.offsetWidth + "px";
  placeholder.style.height = this.element_.offsetHeight + "px";
  this.element_.parentNode.insertBefore(placeholder, this.element_);
  setOpacity(this.element_, 0.5);
  this.placeholder_ = placeholder;
}

// Reposition our placeholder based on the current position of the slide
// being dragged.
Slide.prototype.onDrag_ = function() {
  var container = this.element_.parentNode;
  var top = this.element_.offsetTop;
  var bottom = this.element_.offsetTop + this.element_.offsetHeight;

  for (var sibling = container.firstChild; sibling != null;
       sibling = sibling.nextSibling) {
    if (sibling == this.element_ || sibling == this.placeholder_) continue;

    var siblingTop = sibling.offsetTop;
    var siblingBottom = sibling.offsetTop + sibling.offsetHeight;
    var siblingMiddle = (siblingTop + siblingBottom) / 2;

    if (siblingTop > bottom) continue;
    if (siblingBottom < top) continue;

    if (siblingTop < top && top < siblingMiddle) {
      if (this.placeholder_.nextChild != sibling) {
        container.removeChild(this.placeholder_);
        container.insertBefore(this.placeholder_, sibling);
        return;
      }
    }

    if (bottom > siblingMiddle) {
      if (sibling.nextChild != this.placeholder_) {
        container.removeChild(this.placeholder_);
        container.insertBefore(this.placeholder_, sibling.nextSibling);
        return;
      }
    }
  }
}

// Place our slide back into the slide list DOM and get rid of the placeholder.
Slide.prototype.onDragEnd_ = function() {
  if (!this.placeholder_) return;
  var container = this.element_.parentNode;
  container.removeChild(this.element_);
  this.element_.style.position = "relative";
  this.element_.style.width = "auto";
  this.element_.style.height = "auto";
  this.element_.style.left = "auto";
  this.element_.style.top = "auto";
  setOpacity(this.element_, 1);
  container.insertBefore(this.element_, this.placeholder_);
  container.removeChild(this.placeholder_);
  this.placeholder_ = null;
  Event.trigger(this, "positionchanged");
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
  var element = document.createElement("div");
  element.className = "slidelist";
  element.style.position = "relative";
  container.appendChild(element);
  this.element_ = element;
  var order = [];
  for (var i = 0; i < this.slides_.length; i++) {
    var slide = this.slides_[i];
    order.push(slide.key());
    var slideElement = slide.attachToDOM(element);
    slideElement.slide = slide;
    Event.addListener(slide, "positionchanged",
                      callback(this, this.savePositions_));
  }
  this.order_ = order;
}

// Serializes the order of all of the slides in this list to the server so
// the order will be preserved on refresh.
SlideSet.prototype.savePositions_ = function() {
  // Determine the slide order based on the positions of the DIVs
  var order = [];
  for (var child = this.element_.firstChild; child != null;
       child = child.nextSibling) {
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
  var body = "slides=" + encodeURIComponent(order.join(","));
  download("/setslidepositions.do", null, {
    post: true,
    body: body
  });
}

SlideSet.prototype.changeTheme = function(theme) {
  var body = "theme=" + theme + "&id=" + this.key_;
  download("/changetheme.do", null, {
    post: true,
    body: body
  });
}

// Creates a new slide in this list
SlideSet.prototype.newSlide = function(type) {
  var slide = new Slide(this.key_, null, type, "", "", "");
  this.slides_.push(slide);
  var slideElement = slide.attachToDOM(this.element_);
  slideElement.slide = slide;
  Event.addListener(slide, "positionchanged",
                    callback(this, this.savePositions_));
}

// Mimics goog.exportSymbol and goog.exportProperty from base.js
function exportSymbol(name, symbol) {
  window[name] = symbol;
}

function exportProperty(object, publicName, symbol) {
  object[publicName] = symbol;
}

exportSymbol("Slide", Slide);
exportProperty(Slide, "parseList", Slide.parseList);
exportProperty(Slide, "attachToDOM", Slide.attachToDOM);
exportProperty(Slide, "save", Slide.save);
exportSymbol("SlideSet", SlideSet);
exportProperty(SlideSet.prototype, "attachToDOM", SlideSet.prototype.attachToDOM);
exportProperty(SlideSet.prototype, "changeTheme", SlideSet.prototype.changeTheme);
exportProperty(SlideSet.prototype, "newSlide", SlideSet.prototype.newSlide);
exportSymbol("DialogBox", DialogBox);
exportProperty(DialogBox, "instance", DialogBox.instance);
exportProperty(DialogBox.prototype, "show", DialogBox.prototype.show);
exportSymbol("download", download);
