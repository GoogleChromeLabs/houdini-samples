/*
Copyright 2017 Google, Inc. All Rights Reserved.

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
registerAnimator('hidey-bar', class TwitterHeader {
  constructor(options) {
    this.options = options;
    this.lastScrollPosition = 0;
    this.headerPosition = 0;
    this.frames = 0;
  }

  animate(currentTime, effect) {
    var scrollPosition = currentTime * this.options.scrollRange;
    var isScrolling = scrollPosition !== this.lastScrollPosition;
    
    if (isScrolling) {
      this.scrollLinkedAnimation(scrollPosition);
    } else {
      this.timeLinkedAnimation(scrollPosition);
    }

    effect.children[1].localTime = this.headerPosition;
    this.lastScrollPosition = scrollPosition;
  }

  scrollLinkedAnimation(scrollPosition) {
    var isUp = scrollPosition - this.lastScrollPosition <= 0;

    // if we went from down -> up, reset the header position baseline.
    if (isUp && !this.wasUp) 
      this.headerPosition = scrollPosition - this.options.barHeight;

    if (isUp) {
      // scrolling up, move the header position with scroll so it appears fixed.
      this.headerPosition = Math.min(scrollPosition, this.headerPosition);
    } else {
      // scrolling down, leave header position as is so it moves with content.
    }

    this.wasUp = isUp;
  }

  timeLinkedAnimation(scrollPosition) {
    // attach document timeline so we keep ticking if scroll stops
    this.options.documentTimeline.attach(this);

    // wait a few frames before starting the timed animation
    this.frames += 1;
    if (this.frames <= 10)
      return;

    var gap = scrollPosition - this.headerPosition;
    if (gap <= 0 || gap >=this.options.barHeight) {
      // fully shown/hidden => no animation is needed, detach timeline
      this.options.documentTimeline.detach(this);
      this.frames = 0;
    } else if (gap >= (this.options.barHeight / 2)) {
      // animate to fully hidden
      this.headerPosition -= 2;
    } else {
      // animate to fully shown
      this.headerPosition += 2;
    }
  }
});