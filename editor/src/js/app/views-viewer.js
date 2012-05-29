var SL = SL || {};
SL.views = SL.views || {};

SL.views.viewer = (function() {

  var SlideSetView = Backbone.View.extend({
    el: $('#viewer-iframe'),

    initialize: function() {
      this.$el.attr('src', SL.VIEWER_HOST + 'deckjs/');

      var me = this;
      this.$el.on('load', function() {
        me.render();
      });

      this.slideSet = new SL.models.SlideSet({id: window.location.href.split('/')[5]});
      this.slideSet.on('all reset', this.render, this);
      this.slideSet.fetch();
    },

    render: function() {
      var $window = this.$el[0].contentWindow;
      $window.postMessage(this.slideSet.slides.toJSON(), 'http://localhost:8077');
      return this;
    }

  });

  return {
    'SlideSetView': SlideSetView
  };
  
}());