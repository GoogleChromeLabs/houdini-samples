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
  static get elements() { return [
    {name: 'scroller', inputProperties: ['--scroll-range'], outputProperties: []},
    {name: 'avatar', inputProperties: ['transform'], outputProperties: ['transform']},
    {name: 'bar', inputProperties: ['transform'], outputProperties: ['transform', 'opacity']}]};

  static get timelines() { return [
    {type: 'scroll', options: {orientation: 'vertical'}},
    {type: 'scroll', options: {
      orientation: 'vertical',
      endScrollOffset: '144px',
    }},
  ]};

  animate(elementMap, timelines) {
    var scroller = elementMap.get('scroller')[0];
    var scroll = timelines[1].currentTime;
    var scrollPos = timelines[0].currentTime * parseFloat(scroller.inputStyleMap.get('--scroll-range'));

    elementMap.get('avatar').forEach(elem => {
      var t = elem.inputStyleMap.get('transform');
      t.m11 = 1 - 0.6*scroll;
      t.m22 = 1 - 0.6*scroll;
      t.m41 = -scroll*45*0.6;
      if(scrollPos > 189 - 45 * 0.6) {
        t.m42 = scrollPos - (189 - 45 * 0.6) + 45;
      } else {
        t.m42 = 45;
      }
      elem.outputStyleMap.set('transform', t);
    });
    elementMap.get('bar').forEach(elem => {
      elem.outputStyleMap.set('opacity', scroll);
      var t = elem.inputStyleMap.get('transform');
      t.m42 = scrollPos;
      elem.outputStyleMap.set('transform', t);
    });
  }
});