registerAnimator('image_reveal', class {
  constructor(options) {
      this.options = options || {start:0, width:100, inverse: false};
  }
  animate(currentTime, effect) {
      if (isNaN(currentTime))
        return;

      const scrollOffset = currentTime;
      var progress = (this.options.start - scrollOffset) / this.options.width;
      progress = clamp(1 - progress, 0, 1);
      var t;
      if (this.options.inverse) {
        let currentScale = 0.5 + (0.5) * progress;
        let inverseScale = 1 / currentScale;
        t = inverseScale - 1;
      } else {
        t = progress * 100;
      }
      effect.localTime = t;
  }
});

registerAnimator('passthrough', class {
  animate(currentTime, effect) {
    effect.localTime = currentTime;
  }
});

registerAnimator('icon_effect', class {
  constructor(options, state) {
    this.options = options;
    this.state = state || {commitedFavorited: false, favorited: false};
  }

  animate(currentTime, effect) {
    if (isNaN(currentTime))
      return;
    const scrollOffset = Math.round(currentTime);
    var delta = this.options.start - scrollOffset;
    const progress = delta / this.options.width;

    // We play only when our state
    const shouldPlay = (this.state.favorited == this.options.play_when_favorited);

    if (shouldPlay)
      effect.localTime = clamp(progress, 0,  1) * 100;

    // We commit the states when at 0 and toggle it when at 1.
    if (isNear(progress, 0) || progress < 0) {
      this.state.commitedFavorited = this.state.favorited;
    } else if (isNear(progress, 1) || progress > 1 ) {
      this.state.favorited = !this.state.commitedFavorited;
    }
  }

  // This is a stateful animator. In particular favorited and commited favorited
  // change as we pass the threshold.
  state() {
    return this.state;
  }
});

function clamp(value, min, max) {
  return Math.max(Math.min(value, max), min);
}

function isNear(a, b) {
  return Math.abs(a - b) < 1e-4;
}