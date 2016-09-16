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
(function(scope) {
  "use strict";

  var animatorCtors = {};
  var animators = {};

  // TODO(flackr): Snap scroll input to nearest 1 / deviceScaleFactor.
  class ScrollOffsetsWrapper {
    constructor(proxy) {
      this.proxy_ = proxy;
    }

    get top() { return this.proxy_.scrollTop; }
    get left() { return this.proxy_.scrollLeft; }
  };

  class ProxyElementWrapper {
    constructor(desc) {
      this.scrollOffsets = new ScrollOffsetsWrapper(desc.proxy);
      this.styleMap = new StyleMapWrapper(desc);
    }
  };

  class StyleMapWrapper {
    constructor(desc) {
      this.proxy_ = desc.proxy;
      for (var key in desc.styleMap) {
        if (key != 'transform')
          this[key] = desc.styleMap[key];
      }
    }

    get(key) { return this[key]; }
    set(key, val) { this[key] = val; }

    get transform() { return this.proxy_.transform; }
    set transform(t) { this.proxy_.transform = t; }

    get opacity() { return this.proxy_.opacity; }
    set opacity(t) { this.proxy_.opacity = t; }
  };

  scope.registerAnimator = function(name, ctor) {
    animatorCtors[name] = ctor;
    scope.postMessage({
      'type': 'animator',
      'name': name,
      'details': {
        'inputProperties': ctor.inputProperties || [],
        'outputProperties': ctor.outputProperties || [],
        'inputScroll': !!ctor.inputScroll,
        'outputScroll': !!ctor.outputScroll,
        'rootInputProperties': ctor.rootInputProperties || [],
        'rootOutputProperties': ctor.rootOutputProperties || [],
        'rootInputScroll': !!ctor.rootInputScroll,
        'rootOutputScroll': !!ctor.rootOutputScroll,
    }});
  };

  scope.onmessage = function(event) {
    var data = event.data;
    if (data.type == 'import') {
      var success = true;
      try {
        eval(data.content);
      } catch (e) {
        success = false;
        console.log('Error loading ' + data.src + ' ' + e);
      }
      scope.postMessage({
        'type': 'import',
        'resolve': {'id': data.id,
                    'success': success}});
    } else if (data.type == 'updateElements') {
      // TODO(flackr): Avoid deleting all old animators on element updates.
      animators = {};
      for (var animator in data.elements) {
        animators[animator] = []
        for (var i = 0; i < data.elements[animator].length; i++) {
          var animatorDesc = animators[animator][i] = {'animator': new animatorCtors[animator]()}
          var elemDesc = data.elements[animator][i];
          animatorDesc.root = new ProxyElementWrapper(elemDesc.root);
          animatorDesc.children = [];
          for (var j = 0; j < elemDesc.children.length; j++) {
            animatorDesc.children.push(new ProxyElementWrapper(elemDesc.children[j]));
          }
        }
      }
    }
  }

  var timeline = {'currentTime': 0};
  function raf(ts) {
    timeline.currentTime = ts;
    for (var animator in animators) {
      for (var i = 0; i < animators[animator].length; i++) {
        var desc = animators[animator][i];
        if (desc.root.proxy && !desc.root.proxy.initialized)
          continue;
        var childrenInitialized = true;
        for (var j = 0; j < desc.children.length; j++) {
          if (desc.children[j].proxy && !desc.children[j].proxy.initialized) {
            childrenInitialized = false;
            break;
          }
        }
        if (!childrenInitialized)
          continue;
        try {
          desc.animator.animate(desc.root, desc.children, timeline);
        } catch (e) {
          console.log('Error running ' + animator + ' ' + e);
        }
      }
    }
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Implement console.log since it is currently not installed on
  // CompositorWorker but is useful for debugging: https://crbug.com/646559
  scope.console = scope.console || {
    'log': function(message) {
      scope.postMessage({
        'type': 'log',
        'message': message});
    },
  };

})(self);