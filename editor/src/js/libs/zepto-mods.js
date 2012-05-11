(function($) {
  $.support = {
    opacity: true
  };

  var nativeTrim = String.prototype.trim;
  $.trim = function(str, characters){
    if (!characters && nativeTrim) {
      return nativeTrim.call(str);
    }
    characters = defaultToWhiteSpace(characters);
    return str.replace(new RegExp('\^[' + characters + ']+|[' + characters + ']+$', 'g'), '');
  };

  Event.prototype.isDefaultPrevented = function() {
    return this.defaultPrevented;
  };
  
})(Zepto);