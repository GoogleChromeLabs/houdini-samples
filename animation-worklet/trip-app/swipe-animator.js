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


registerAnimator('icon_effect', class {
  constructor(options) {
      console.log(options);
      this.start_ = options.start;
      this.width_ = options.width;
      this.play_when_favorited_ = options.play_when_favorited;
      this.favorited_ = false;

      this.commitedFavoriteState_ = false;
  }

  animate(currentTime, effect) {
      const scrollOffset = Math.round(currentTime);
      var delta = this.start_ - scrollOffset;
      const progress = delta / this.width_;

      if (progress < 0)
        return;

      if (!this.favorited_ && !this.play_when_favorited_) {
        // bug, at 1 we disable the animation!
        effect.localTime = Math.min(progress, 1) * 100;
      } else if (this.favorited_ && this.play_when_favorited_) {
        // play the transform animation
        effect.localTime = Math.min(progress, 1) * 100;
      }

      if (progress <= 0) {
        this.commitedFavoriteState_ = this.favorited_;
      } else if (progress > 0 && progress < 1) {
        //console.log(`${progress}`);
      } else if (progress > 1) {
        // We are passed threshold, toggle the state
        this.favorited_ = !this.commitedFavoriteState_;
      }
  }
});
