var Slide = Backbone.Model.extend({

  defaults: function() {
    return {
      setId: null,
      title: 'Untitled',
      content: ''
    };
  },

  url : function() {
    if (this.id) {
      return '/api/sets/' + this.get('setId') + '/slides/' + this.id;
    } else {
      return '/api/sets/' + this.get('setId') + '/slides';
    }
  },

  initialize: function() {
    this.on('change:content', this.updateTitle, this);
    this.on('remove', this.remove, this);
    this.updateTitle();
  },

  remove: function() {
    this.destroy();
  },

  updateTitle: function() {
    var $contentAsHtml = $('<div>' + this.get('content') + '</div>');
    var autoTitle = $contentAsHtml.find('h1').text();
    if (!autoTitle) {
      autoTitle = $.trim(this.get('content') || '').split(' ')[0];
    }
    if (!autoTitle) {
      autoTitle = 'Untitled';
    }
    this.set({'title': autoTitle});
  }
});

// its more backboey to fetch on collections
var SlideCollection = Backbone.Collection.extend({
  model: Slide
});

var SlideSet = Backbone.Model.extend({

  // Default attributes for the todo item.
  defaults: function() {
    return {
      id: null,
      title: '',
      theme: null,
      slides: []
    };
  },

  url : function() {
    // Change to more RESTful later
    if (this.id) {
      return '/api/sets/' + this.id;
    } else {
      return '/api/sets/';
    }
  },
 
  // {slides: [{}, {}]}
  initialize : function() {
    this.slides = new SlideCollection();
  },

  parse: function(resp) {
    this.slides.reset(resp.slides);
    delete resp.slides;
    return resp;
  }

});