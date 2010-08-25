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
  goog.events.listen(this.titleContainer_, goog.events.EventType.KEYPRESS, goog.bind(this.onEditKeyPress_, this));
  goog.events.listen(this.titleContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
  goog.events.listen(this.titleContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);

   // Make subtitle cell
  var subtitleCell = this.createElement_("td", tr, "subtitlecol");
  this.subtitleContainer_ = this.createElement_("input", subtitleCell);
  if (this.type_ != Slide.TYPE_INTRO) this.subtitleContainer_.disabled = true;
  goog.events.listen(this.subtitleContainer_, goog.events.EventType.KEYPRESS, goog.bind(this.onEditKeyPress_, this));
  goog.events.listen(this.subtitleContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
  goog.events.listen(this.subtitleContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);
  this.subtitleContainer_.value = this.subtitle_ || "";

  // Make content input
  var contentCell = this.createElement_("td", tr, "contentcol");
  this.contentContainer_ = this.createElement_("textarea", contentCell);
  this.contentContainer_.style.width = "60%";
  if (this.type_ != Slide.TYPE_NORMAL) this.contentContainer_.disabled = true;
  goog.events.listen(this.contentContainer_, goog.events.EventType.BLUR, goog.bind(this.saveEdit_, this));
  goog.events.listen(this.contentContainer_, goog.events.EventType.MOUSEDOWN, goog.events.Event.stopPropagation);
  this.contentContainer_.value = this.content_ || "";

  goog.style.setUnselectable(element, false);

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
  goog.net.XhrIo.send('/editslide.do',
    goog.bind(this.onSave_, this),
    'POST',
    args.join("&")
  );
}

// Called when the save slide AJAX request finishes.
Slide.prototype.onSave_ = function(e) {
  var xhrio = e.target;
  if (xhrio.isSuccess()) {
    this.key_ = xhrio.getResponseText();
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
  }
  this.order_ = order;
  this.makeDraggable_();
};

SlideSet.prototype.makeDraggable_ = function() {
  var me = this;
  if (this.dlg_) this.dlg_.disposeInternal();

  var dlg = new goog.fx.DragListGroup();
  dlg.addDragList(this.element_, goog.fx.DragListDirection.DOWN);
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
  goog.net.XhrIo.send('/setslidepositions.do', null, 'POST', body);
}

SlideSet.prototype.changeTheme = function(theme) {
  var body = "theme=" + theme + "&id=" + this.key_;
  goog.net.XhrIo.send('/changetheme.do', null, 'POST', body);
}

// Creates a new slide in this list
SlideSet.prototype.newSlide = function(type) {
  var slide = new Slide(this.key_, null, type, "", "", "");
  this.slides_.push(slide);
  var slideElement = slide.attachToDOM(this.element_);
  slideElement.slide = slide;
  this.makeDraggable_();
}
