var InboxView = Backbone.View.extend({
  el: $('#inbox'),

  events: {
    "click #new-slide-button":  "onNewSlideButton",
    "click #delete-slide-button": "onDeleteSlideButton",
    "click #publish-button": "onPublishButton"
  },

initialize: function() {
    this.template = Handlebars.compile($('#slide-edit-template').html());
    this.model.bind('change', this.updateView, this);
  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },

});