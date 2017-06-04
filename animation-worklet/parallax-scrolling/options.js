document.addEventListener('DOMContentLoaded', function() {
  window.options = document.querySelectorAll('#options label');

  // Init checkboxes
  Array.prototype.forEach.call(options, function(option) {
    var name = option.className.replace('.option', '').trim().replace('.', '');
    if(!flagIsSet(name)) {
      option.querySelector('input').checked = true;
    }
  });

  document.querySelector('#options button').onclick = function() {
    var opts = Array.prototype.filter.call(options, function(option) {
      return !option.querySelector('input').checked;
    }).map(function(option) {
      return option.className.replace('.option', '').trim().replace('.', '');
    });
    location.search = '?' + opts.join('&');
  };
});
