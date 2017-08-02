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
    this.lastBarPosition = 0;
    this.frameCount = 0;
  }
  
  animate(currentTime, effect) {
    var scrollPosition = currentTime * this.options.scrollRange;
    // A primitive way to detect when scrolling has stopped. We really need ScrollTimeline.phase for
    // this
    var isScrolling = scrollPosition !== this.lastScrollPosition;
    
    var barPosition = isScrolling ? this.scrollLinkedAnimation(scrollPosition)
                                  : this.timeLinkedAnimation(scrollPosition);

    effect.localTime = barPosition;
    
    this.lastBarPosition = barPosition;
    this.lastScrollPosition = scrollPosition;
  }
  
  scrollLinkedAnimation(scrollPosition) {
    var isUp = scrollPosition - this.lastScrollPosition <= 0;
    var position = this.lastBarPosition;
    
    // We went from down -> up, reset the header position baseline.
    if (isUp && !this.wasUp)
      position = scrollPosition - this.options.barHeight;
    
    if (isUp) {
      // scrolling up, move the header position with scroll so it appears fixed.
      position = Math.min(scrollPosition, position);
    } // else we are scrolling down, leave header position as is so it moves with content.
    
    this.wasUp = isUp;
    return position;
  }
  
  timeLinkedAnimation(scrollPosition) {
    // attach document timeline so we keep ticking if scroll stops.
    this.options.documentTimeline.attach(this);
    
    // wait a few frames before starting the time linked animation.
    this.frameCount += 1;
    if (this.frameCount <= 10)
      return this.lastBarPosition;
    
    var gap = scrollPosition - this.lastBarPosition;
    if (gap <= 0 || gap >= this.options.barHeight) {
      // bar is fully shown/hidden and no animation is needed so we detach timeline.
      this.options.documentTimeline.detach(this);
      this.frameCount = 0;
      return this.lastBarPosition;
    }
    
    // animate to fully hidden if the bar is more than half hidden or to fully shown otherwise. 
    var delta = gap <= (this.options.barHeight / 2) ? 2 : -2;
    return this.lastBarPosition + delta;
  }
});