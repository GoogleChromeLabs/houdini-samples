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
registerAnimator('twitter-header', class TwitterHeader {
  constructor(options) {
    this.options = options;
    this.options.avatarTimeline.attach(this);
  }

  animate(currentTime, effects) {
    var scrollPos = currentTime * this.options.scrollRange;
    // Avatar scale
    effects[0].localTime = this.options.avatarTimeline.currentTime;
    // Avatar position
    effects[1].localTime = scrollPos > 189 - 45 * 0.6 ?
        scrollPos - (189 - 45 * 0.6) + 45 : 45;
    // Header bar position
    effects[2].localTime = scrollPos;
    // Header bar opacity
    effects[3].localTime = this.options.avatarTimeline.currentTime;
  }
});