
// Strategy: get data from server, refresh model which refreshes view

// when we get content from server, do this: content.replace(/NEWLINE/g, '\n') || '';
// Resize slideArea on windowResize

// On change to slide textarea, update model and update preview
// Save new order of slides whenever they are dragged and dropped
// Make them draggable

// Be able to change theme, change title, change publish state

EVENT_SLIDE_REMOVED    = 'slide-removed';
EVENT_SLIDE_SELECTED   = 'slide-selected';
EVENT_THUMB_CLICKED    = 'slide-thumb-clicked';

var SlideView = Backbone.View.extend({

  render: function() {
    this.thumbView   = new SlideThumbView({model: this.model});
    this.editView    = new SlideEditView({model: this.model});
    this.previewView = new SlidePreviewView({model: this.model});
    this.thumbView.on(EVENT_THUMB_CLICKED, this.onThumbClick, this);
    $('#slide-thumbs').append(this.thumbView.render().el);

    this.model.on('remove', this.onRemove, this);

    return this;
  },

  onRemove: function() {
    // Gross but don't know better way, since models don't know their views
    this.thumbView.$el.next(this.thumbView.className).trigger('click');

    this.thumbView.$el.remove();
    this.editView.$el.remove();
    this.previewView.$el.hide(); 
  },

  onThumbClick: function() {
    $('#slide-edit-area').empty().append(this.editView.render().el);
    this.previewView.updateView();
    this.trigger(EVENT_SLIDE_SELECTED, this.model);
  }

});

var SlideThumbView = Backbone.View.extend({
  tagName:  'li',
  className: 'slide-thumb',

  events: {
    'click'   : 'onThumbClick',
  },

  initialize: function() {
    this.template = Handlebars.compile($('#slide-edit-template').html());
    this.model.on('change', this.updateView, this);
  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },

  updateView: function() {
    this.$el.html(this.model.get('title'));
  },

  onThumbClick: function() {
    $('.' + this.className).removeClass('selected');
    this.$el.addClass('selected');
    this.trigger(EVENT_THUMB_CLICKED);
  }
});


var SlideEditView = Backbone.View.extend({
  tagName:  'div',

  events: {
    'keyup textarea'     :'onKeyUp'
  },

  initialize: function() {
    this.template = Handlebars.compile($('#slide-edit-template').html());
    this.model.bind('change', this.updateView, this);
  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },

  updateView: function() {
    // Dont re-render if user is typing
    if (document.activeElement != this.$('textarea')[0]) {
      this.$('textarea').val(this.model.get('content'));
    }
    this.$el.show();
    return this;
  },

  typingTimer: null,
  doneTypingInterval: 1000,
  onKeyUp: function() {
    this.model.set({content: this.$('textarea').val()});

    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(_.bind(this.saveSlide, this), this.doneTypingInterval);
  },

  saveSlide: function() {
    this.model.save();
  }

});


var SlidePreviewView = Backbone.View.extend({
  el: '#slide-preview-iframe',

  initialize: function() {
    this.model.bind('change', this.updateView, this);
  },

  render: function() {
    this.updateView();
    return this;
  },

  updateView: function() {
    this.$el.attr('srcdoc', this.model.get('content'));
    return this;
  }
});

var SlideSetView = Backbone.View.extend({
  el: $('body'),

  events: {
    "click #new-slide-button":  "onNewSlideButton",
    "click #delete-slide-button": "onDeleteSlideButton",
    "click #publish-button": "onPublishButton"
  },

  initialize: function() {
    this.slideSet = new SlideSet({id: window.location.href.split('/')[5]});

    this.slideSet.on('all reset', this.render, this);
    this.slideSet.slides.on('add remove', this.render, this);
    this.slideSet.slides.on('add', this.onNewSlide, this);
    this.slideSet.slides.on('reset', this.onAllSlides, this);

    // Should do bootstrapping instead - http://documentcloud.github.com/backbone/#FAQ-bootstrap
    this.slideSet.fetch();
  },

  render: function() {
    $('#slide-set-title').html(this.slideSet.get('title'));
    var slideLabel = (this.slideSet.slides.length == 1) ? 'slide' : 'slides';
    $('#slide-set-count').html(this.slideSet.slides.length + ' ' + slideLabel);
    var publishLabel = this.slideSet.get('published') ? 'Un-Publish' : 'Publish';
    $('#publish-button').html(publishLabel);
    return this;
  },

  onPublishButton: function() {
    this.slideSet.set({published: true});
    this.slideSet.save();
  },

  onNewSlideButton: function() {
    this.slideSet.slides.create({setId: this.slideSet.get('id')}, {wait: true});
  },

  onDeleteSlideButton: function() {
    this.slideSet.slides.remove(this.activeSlide);
  },

  onAllSlides: function() {
    this.slideSet.slides.each(this.onNewSlide, this);
  },

  onNewSlide: function(slide) {
    var slideView = new SlideView({model: slide});
    slideView.render();
    slideView.on(EVENT_SLIDE_SELECTED, this.onActiveSlide, this);
  },

  onActiveSlide: function(slide) {
    this.activeSlide = slide;
  }

});
