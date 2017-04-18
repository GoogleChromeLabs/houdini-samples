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
registerAnimator('expand', class SpringAnimator {
  static get elements() { return [
    {name: 'clip', inputProperties: ['--expand-scale'], outputProperties: ['transform']},
    {name: 'content', inputProperties: [], outputProperties: ['transform']},
    {name: 'small', inputProperties: [], outputProperties: ['opacity']},
    {name: 'large', inputProperties: [], outputProperties: ['opacity']}]; }
  static get timelines() { return [{'type': 'document', options: {}}]; }

  animate(elementMap, timelines) {
    // TODO(flackr): Control transition through input.
    // TODO(flackr): Use non-linear transition.
    var repeatTime = timelines[0].currentTime * 0.001 % 5;
    var t = 0;
    if (repeatTime < 2)
      t = Math.max(0, repeatTime - 1);
    else if (repeatTime > 3)
      t = Math.max(0, 4 - repeatTime);
    else
      t = 1;

    var clip = elementMap.get('clip')[0];
    var content = elementMap.get('content')[0];
    var small = elementMap.get('small')[0];
    var large = elementMap.get('large')[0];
    var expandScale = parseFloat(clip.inputStyleMap.get('--expand-scale'));
    var scale = (expandScale - 1) * t + 1;

    clip.outputStyleMap.set('transform', new CSSTransformValue([
        new CSSScale(scale, scale)]));

    // Counter-scale the content elements.
    var counterScale = 1 / scale;
    var offset = 50 * (scale - 1);
    content.outputStyleMap.set('transform', new CSSTransformValue([
      new CSSScale(counterScale, counterScale),
      new CSSTranslation(new CSSSimpleLength(0, 'px'),
                         new CSSSimpleLength(offset, 'px'))]));

    // Crossfade between small and large.
    small.outputStyleMap.set('opacity', 1 - t);
    large.outputStyleMap.set('opacity', t);
  }

});