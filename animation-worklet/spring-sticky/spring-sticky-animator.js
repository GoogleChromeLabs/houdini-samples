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
registerAnimator('spring-sticky', class SpringAnimator {
  static get elements() { return [
    {name: 'scroller', inputProperties: ['--scroll-range'], outputProperties: []},
    {name: 'box', inputProperties: [], outputProperties: ['transform']}]; }
  static get timelines() { return [{'type': 'scroll', options: {}}]; }

  constructor() {
    this.velocities = [];
    this.positions = [];
  }

  animate(elementMap, timelines) {
    var boxes = elementMap.get('box');
    if (boxes.length != this.velocities.length) {
      // If number of elements change, stored state is no longer correct.
      this.velocities = [];
      this.positions = [];
      for (var i = 0; i < boxes.length; i++) {
        this.velocities.push(0);
        this.positions.push(0);
      }
    }
    var scroller = elementMap.get('scroller')[0];
    var targetPos = timelines[0].currentTime * parseFloat(scroller.inputStyleMap.get('--scroll-range'));
    for (var i = 0; i < boxes.length; i++) {
      if (i == 0) {
        // Box 0 stays stuck.
        this.positions[i] = targetPos;
      } else {
        var delta = Math.max(-20, Math.min(20, targetPos - this.positions[i]));
        this.velocities[i] = this.velocities[i] * 0.95 + delta * 0.05;
        this.positions[i] += this.velocities[i];
        // Positions cannot stretch, but can collapse.
        this.positions[i] = Math.max(targetPos - 100, Math.min(targetPos, this.positions[i]));
      }
      boxes[i].outputStyleMap.set('transform', new CSSTransformValue([
        new CSSTranslation(new CSSSimpleLength(0, 'px'),
                           new CSSSimpleLength(this.positions[i], 'px'))]));
      targetPos = this.positions[i];
    }
  }

});