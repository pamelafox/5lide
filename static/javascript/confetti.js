 /* Define the number of confettis to be used in the animation */
 const CONFETTIS = 20;

 function init() {

    /* Fill the empty container with freshly driven confetti */
    var first = true;
    for (var i = 0; i < CONFETTIS; i++) {
      document.body.appendChild(makeConfetti(first));
      first = false;
    }
  }

  /*
    Receives the lowest and highest values of a range and
    returns a random integer that falls within that range.
  */
  function randomInteger(low, high) {
    return low + Math.floor(Math.random() * (high - low));
  }

  /*
     Receives the lowest and highest values of a range and
     returns a random float that falls within that range.
  */
  function randomFloat(low, high) {
    return low + Math.random() * (high - low);
  }

  function randomItem(items) {
    return items[randomInteger(0, items.length - 1)]
  }

  /* Returns a duration value for the falling animation.*/
  function durationValue(value) {
    return value + 's';
  }

  function makeConfetti(is_first) {
    var confettis = ['2730', '272F', '272B', '272C', '2727', '2729'];
    var colors = ['red','blue','green','red','yellow','purple','pink','lightGreen','lightBlue'];
    var sizes = ['tiny', 'tiny', 'tiny', 'small', 'small', 'small', 'small', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium', 'large', 'massive'];

    /* Start by creating a wrapper div, and an empty span  */
    var confettiElement = document.createElement('div');
    confettiElement.className = 'confetti ' + randomItem(sizes);

    var confetti = document.createElement('span');
    confetti.innerHTML = '&#x' + randomItem(confettis) + ';';
    confetti.style.color = randomItem(colors);

    confettiElement.appendChild(confetti);

    /* Randomly choose a spin animation */
    var spinAnimationName = (Math.random() < 0.5) ? 'clockwiseSpin' : 'counterclockwiseSpin';

     /* Randomly choose a side to anchor to, keeps the middle more dense and fits liquid layout */
     var anchorSide = (Math.random() < 0.5) ? 'left' : 'right';

    /* Figure out a random duration for the fade and drop animations */
    var fadeAndDropDuration = durationValue(randomFloat(5, 11));

    /* Figure out another random duration for the spin animation */
    var spinDuration = durationValue(randomFloat(4, 15));

    // how long to wait before the confettis arrive
    var confettiDelay = is_first ? 0 : durationValue(randomFloat(0, 7));

    confettiElement.style.webkitAnimationName = 'fade, drop';
    confettiElement.style.webkitAnimationDuration = fadeAndDropDuration + ', ' + fadeAndDropDuration;
    confettiElement.style.webkitAnimationDelay = confettiDelay;

    /* Position the confetti at a random location along the screen, anchored to either the left or the right*/
    confettiElement.style[anchorSide] = randomInteger(0, 60) + '%';

    confetti.style.webkitAnimationName = spinAnimationName;
    confetti.style.webkitAnimationDuration = spinDuration;


    /* Return this confetti element so it can be added to the document */
    return confettiElement;
  }

  window.onload = init;
