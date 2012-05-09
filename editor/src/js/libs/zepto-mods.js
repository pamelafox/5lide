(function($) {
  $.support = {
    opacity: true
  };

  Event.prototype.isDefaultPrevented = function() {
    return this.defaultPrevented;
  };
  
})(Zepto);