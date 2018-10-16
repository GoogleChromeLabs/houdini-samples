registerAnimator('material_tab_swipe', class {
  constructor(options) {
      console.log(options);
      this.offset_ = options.offset;
      this.width_ = options.width;
  }
  animate(currentTime, effect) {
      const scrollOffset = currentTime;
      var delta = Math.abs(scrollOffset - this.offset_);
      // bug, at 1 we disable the animation!
      const progress = Math.min(delta / this.width_, 0.999);
      // if (progress > 0 && progress < 1)
      //     console.log(`Article active at ${scrollOffset} with (${this.offset_}, ${this.width_}) => ${progress}`);
      effect.localTime = progress * 100;
  }
});


registerAnimator('passthrough', class {
    animate(currentTime, effect) {
        effect.localTime = currentTime;
    }
});