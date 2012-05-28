var InboxView = Backbone.View.extend({
  el: $('#inbox'),

  events: {
     "click #modal-newset-button":  "onNewSetButton",
  },

  initialize: function() {
    this.template = Handlebars.compile($('#inbox-template').html());

    this.inbox = new Inbox();
    this.inbox.on('all', this.render, this);
    this.inbox.slidesets.on('all add remove reset', this.render, this);
    this.inbox.fetch();
  },

  render: function() {
    this.$('#inbox-area').html(this.template({'slidesets': this.inbox.slidesets.toJSON()}));
    this.$('#inbox-area .timeago').timeago();
    return this;
  },

  onNewSetButton: function() {
    this.inbox.slidesets.create({title: $('#modal-newset input[name="title"]').val() }, {wait: true});
  }

});