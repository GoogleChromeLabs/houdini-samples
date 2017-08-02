/*
Copyright 2016 Google, Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
function sign(value) {
  return value < 0 ? -1 : 1;
}

var MIN_HIDE_AMOUNT = -50;
var MAX_HIDE_AMOUNT = 0;
var HIDE_SPEED = 0.35;

registerAnimator('twitter-header', class TwitterHeader {
  constructor(options) {
    this.options = options;
    this.documentTimeline = options.documentTimeline;
    this.scrollTimeline = options.scrollTimeline;
    this.options.avatarTimeline.attach(this);
    this.lastScrollPos_ = this.options;
    this.hideAmount_ = 0;
    this.hideChange_ = 0;
    this.lastScrollPos_ = -1;
    this.lastTime_ = 0;
    this.lastScrollPhase_ = this.scrollTimeline.phase;
  }

  animate(currentTime, effect) {
    var scrollPos = currentTime * this.options.scrollRange;
    var timeDelta = this.documentTimeline.currentTime - this.lastTime_;
    // Avatar scale
    effect.children[0].localTime = this.options.avatarTimeline.currentTime;
    // Header bar opacity
    effect.children[3].localTime = this.options.avatarTimeline.currentTime;

    // We don't want the header to hide (or ever go above 189).
    var currentMinHideAmount = Math.max(Math.min(0, 189 - scrollPos), MIN_HIDE_AMOUNT);

    if (this.scrollTimeline.phase == 'idle') {
      // When the scroll goes idle, determine if we need to keep sliding the header.
      if (this.hideAmount_ != currentMinHideAmount && this.hideAmount_ != MAX_HIDE_AMOUNT) {
        if (this.lastScrollPhase_ == 'active') {
          this.documentTimeline.attach(this);
        } else {
          this.hideAmount_ += this.hideChange_ * timeDelta;
          this.hideAmount_ = Math.max(currentMinHideAmount, Math.min(MAX_HIDE_AMOUNT, this.hideAmount_));
        }
      } else {
        this.documentTimeline.detach(this);
      }
    }
    if (scrollPos != this.lastScrollPos_) {
      // Track the last scroll and
      var lastScroll = (this.lastScrollPos_ - scrollPos);
      var direction = sign(lastScroll);
      var speed = HIDE_SPEED;
      this.hideChange_ = speed * direction;
      this.hideAmount_ += lastScroll;
      this.hideAmount_ = Math.max(currentMinHideAmount, Math.min(MAX_HIDE_AMOUNT, this.hideAmount_));
    }

    // Avatar position
    effect.children[1].localTime = scrollPos > 189 - 45 * 0.6 ?
        scrollPos - (189 - 45 * 0.6) + 45 + this.hideAmount_ : 45 + this.hideAmount_;

    // Header bar position
    effect.children[2].localTime = scrollPos + this.hideAmount_;

    this.lastScrollPos_ = scrollPos;
    this.lastTime_ = this.documentTimeline.currentTime;
    this.lastScrollPhase_ = this.scrollTimeline.phase;
  }
});