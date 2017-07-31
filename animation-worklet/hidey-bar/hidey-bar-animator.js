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
    this.lastScrollPos = 0;
  }

  animate(currentTime, effect) {
    var scrollPos = currentTime * this.options.scrollRange;

    var isScrolling = scrollPos !== this.lastScrollPos;
    var isDown = scrollPos - this.lastScrollPos > 0;

    this.lastScrollPos = scrollPos;


    if (isDown) {
      //  scrolling down, let header move with the content

      // clear baseline offset
      this.baselineOffset = null;
    } else {
      // scrolling up, reset baseline offset and maintain it
      if (!this.baselineOffset)
        this.baselineOffset = scrollPos - this.options.barHeight;
      effect.children[1].localTime = Math.min(scrollPos, this.baselineOffset);
    }
  }
});