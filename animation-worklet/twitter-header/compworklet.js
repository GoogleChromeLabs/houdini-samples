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
  static get inputProperties() { return ['--part']; }
  static get outputProperties() { return ['opacity', 'transform']; }
  static get inputTime() { return true; }
  static get rootInputScroll() { return true; }

  animate(root, children, timeline) {
    var scroll = root.scrollOffsets.top / (189 - 45);
    if (scroll > 1) {
      scroll = 1;
    }
    children.forEach(elem => {
      var part = elem.styleMap.get('--part');
      if (part == 'avatar') {
        var t = elem.styleMap.transform;
        t.m11 = 1 - 0.6*scroll;
        t.m22 = 1 - 0.6*scroll;
        t.m41 = -scroll*45*0.6;
        if(root.scrollOffsets.top > 189 - 45 * 0.6) {
          t.m42 = root.scrollOffsets.top - (189 - 45 * 0.6) + 45;
        } else {
          t.m42 = 45;
        }
        elem.styleMap.transform = t;
      } else if (part == 'bar') {
        elem.styleMap.opacity = scroll;
        var t = elem.styleMap.transform;
        t.m42 = root.scrollOffsets.top;
        elem.styleMap.transform = t;
      }
    });
  }
});