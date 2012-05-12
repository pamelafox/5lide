
// Strategy: get data from server, refresh model which refreshes view

// when we get content from server, do this: content.replace(/NEWLINE/g, '\n') || '';
// Resize slideArea on windowResize

// On change to slide textarea, update model and update preview
// Save new order of slides whenever they are dragged and dropped
// Make them draggable

// Be able to change theme, change title, change publish state

var SlideView = Backbone.View.extend({
  el: 'body',

  render: function() {
    this.thumbView  = new SlideThumbView({model: this.model});
    this.editView   = new SlideEditView({model: this.model});
    this.thumbView.on('thumbclick', this.onThumbClick, this);
    $('#slide-thumbs').append(this.thumbView.render().el);
    return this;
  },

  onThumbClick: function() {
    this.editView.render();
    this.editView.$el.show();
  }

});

var SlideThumbView = Backbone.View.extend({
  tagName:  'div',
  template: _.template($('#slide-thumb-template').html()),

  events: {
    'click'   : 'onThumbClick',
  },

  initialize: function() {
    this.model.bind('change', this.updateView, this);
  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },

  updateView: function() {
    this.$('.slide-thumb-title').html(this.model.get('title'));
  },

  onThumbClick: function() {
    this.trigger('thumbclick');
  }
});


var SlideEditView = Backbone.View.extend({
  el: '#slide-edit-area',

  events: {
    'keyup textarea'   :'onKeyAction'
  },

  initialize: function() {
    this.model.bind('change', this.render, this);
    this.model.bind('destroy', this.remove, this);
  },

  render: function() {
    // Dont re-render if user is typing
    if ($(document.activeElement).attr('id') == ('slide-edit-textarea')) {
      this.$('textarea').val(this.model.get('content'));
    }
    return this;
  },

  onKeyAction: function() {
    this.model.set({content: this.$('textarea').val()});
    this.model.save();
  }
});

function getUrlParam(name, url) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec(unescape(url || window.location.href));
  if( results === null )
    return null;
  else
    return results[1];
}

// A view has a model or collection assoc

// new SlideSetView({collection: new SlideSet()})
var SlideSetView = Backbone.View.extend({
  el: $('body'),

  events: {
    "click #new-slide-button":  "onNewSlideButton",
    "click #delete-slide-button": "onDeleteSlideButton"
  },

  initialize: function() {
    this.slideSet = new SlideSet({id: window.location.href.split('/')[5]});

    // listen to add/reset for slide collection, instantiate slidethumbview and slideeditview
    this.slideSet.bind('all', this.render, this);
    this.slideSet.bind('reset', this.render, this);
    this.slideSet.slides.bind('add', this.onNewSlide, this);
    this.slideSet.slides.bind('reset', this.onAllSlides, this);

    // Should do bootstrapping instead - http://documentcloud.github.com/backbone/#FAQ-bootstrap
    this.slideSet.fetch();
  },

  render: function() {
    $('#slide-set-title').html(this.slideSet.get('title'));
    $('#slide-set-count').html(this.slideSet.get('slides').length);
    this.slideSet.slides.each(this.onNewSlide);
    return this;
  },

  onNewSlideButton: function() {
    this.slideSet.slides.create({setId: this.slideSet.get('id')}, {wait: true});
  },

  onDeleteSlideButton: function() {
  },

  onAllSlides: function() {
    console.log('on all slides');
    this.slideSet.slides.each(this.onNewSlide);
  },

  onNewSlide: function(slide) {
    var slideView = new SlideView({model: slide});
    slideView.render();
  }

});

new SlideSetView();
