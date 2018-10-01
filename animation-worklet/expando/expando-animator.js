registerAnimator('expando', class ExpandAnimator {
  constructor(options) { }

  animate(currentTime, effect) {
    var repeatTime = currentTime * 0.001 % 5;
    var t = 0;
    if (repeatTime < 2)
      t = Math.max(0, repeatTime - 1);
    else if (repeatTime > 3)
      t = Math.max(0, 4 - repeatTime);
    else
      t = 1;
    effect.localTime = t * 1000;
  }
});

registerAnimator('reverseExpando', class ReverseExpandAnimator {
  constructor(options) {
    this.options = options;
  }

  animate(currentTime, effect) {
    var repeatTime = currentTime * 0.001 % 5;
    var t = 0;
    if (repeatTime < 2)
      t = Math.max(0, repeatTime - 1);
    else if (repeatTime > 3)
      t = Math.max(0, 4 - repeatTime);
    else
      t = 1;

    var expandScale = 13; //this.options.expandScale;
    var scale = (expandScale - 1) * t + 1;

    // Counter-scale the content elements.
    var counterScale = 1 / scale;
    var maxCounterScale = 1 / expandScale;
    effect.localTime = (counterScale - 1) / (maxCounterScale - 1) * 1000;
  }
});
