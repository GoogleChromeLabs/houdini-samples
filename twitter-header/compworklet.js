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
function TwitterHeader() {
}

TwitterHeader.prototype.tick = function(timestamp) {
  if (!this.initialized)
    return;
  var scroll = this.scroller.scrollTop/(189-45);

  var t = this.avatar.transform;
  if (scroll > 1) {
    scroll = 1;
  }
  t.m11 = 1 - 0.6*scroll;
  t.m22 = 1 - 0.6*scroll;
  t.m41 = -scroll*45*0.6;
  if(this.scroller.scrollTop > 189-45*0.6) {
    t.m42 = this.scroller.scrollTop - (189-45*0.6) + 45;
  } else {
    t.m42 = 45;
  }
  this.avatar.transform = t;

  this.bar.opacity = scroll;
  var t = this.bar.transform;
  t.m42 = this.scroller.scrollTop;
  this.bar.transform = t;
};

TwitterHeader.prototype.onmessage = function(e) {
  this.initialized = true;
  this.scroller = e.data[0];
  this.avatar = e.data[1];
  this.bar = e.data[2];
};

registerCompositorAnimator('twitter-header', TwitterHeader);