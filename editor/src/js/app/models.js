var SL = SL || {};

SL.models = (function() {

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

  var SlideCollection = Backbone.Collection.extend({
    model: Slide
  });

  var SlideSet = Backbone.Model.extend({

    /*
     id
     title
     slides
     slideIds
     format
     theme
     published
     updated
     */
    defaults: function() {
      return {
        title: 'Untitled'
      };
    },

    url : function() {
      if (this.id) {
        return '/api/sets/' + this.id;
      } else {
        return '/api/sets';
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

  var SlideSetCollection = Backbone.Collection.extend({
    model: SlideSet
  });

  var Inbox = Backbone.Model.extend({

    url: function() {
      return '/api/inbox';
    },

    initialize: function() {
      this.slidesets = new SlideSetCollection();
    },

    parse: function(resp) {
      this.slidesets.reset(resp.slidesets);
      delete resp.slidesets;
      return resp;
    }

  });

  return {
    'Slide': Slide,
    'SlideCollection': SlideCollection,
    'SlideSet': SlideSet,
    'SlideSetCollection': SlideSetCollection,
    'Inbox': Inbox
  };

}());

SL.VIEWER_HOST = 'http://5lide-viewer.appspot.com';
if (window.location.hostname === 'localhost') {
  SL.VIEWER_HOST  = 'http://localhost:8077';
}
