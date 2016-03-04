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
function ParallaxAnimator() {
}

ParallaxAnimator.prototype.tick = function(timestamp) {
  var t = this.parallax.transform;
  t.m42 = -0.1 * this.scroller.scrollTop;
  this.parallax.transform = t;
}

ParallaxAnimator.prototype.onmessage = function(e) {
  this.scroller = e.data[0];
  this.parallax = e.data[1];
};

registerCompositorAnimator('parallax', ParallaxAnimator);