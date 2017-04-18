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

  // TODO(flackr): Detect if we have native support for animationWorklet.

  // The current list of animated elements.
  var animatedElements = {};

  // Callback dispatched when the set of animated elements is updated.
  var onElementsUpdated = function() {};

  // The implementation of AnimationWorklet which uses a CompositorWorker to
  // implement animations on the compositor thread.
  var CompositorWorkerAnimationWorklet = function() {
    var awaitingPromises = [];

    // Find the path of this running script to locate the worker helper.
    var scriptEls = document.getElementsByTagName( 'script' );
    var thisScriptEl = scriptEls[scriptEls.length - 1];
    var scriptPath = thisScriptEl.src;
    var scriptFolder = scriptPath.substr(0, scriptPath.lastIndexOf( '/' ) + 1);

    var animators = {};

    var cw = new CompositorWorker(scriptFolder + 'anim-worklet-worker.js');
    cw.onmessage = function(event) {
      var data = event.data;
      if (data.resolve) {
        if (data.resolve.success)
          awaitingPromises[data.resolve.id].resolve(data.resolve.arguments);
        else
          awaitingPromises[data.resolve.id].reject(data.resolve.arguments);
        delete awaitingPromises[data.resolve.id];
      }
      if (data.type == 'log') {
        console.log(data.message);
      } else if (data.type == 'animator') {
        animators[data.name] = data.details;
        // TODO(flackr): Do a targeted update of just the added animation worklet.
        updateCWElements();
      }
    };

    onElementsUpdated = updateCWElements;

    function getProperties(elem, properties) {
      var result = {}
      var cs = getComputedStyle(elem);
      for (var i = 0; i < properties.length; i++) {
        result[properties[i]] = cs.getPropertyValue(properties[i]).trim();
      }
      return result;
    }

    var acceleratedStyles = {
      'opacity': true,
      'transform': true};
    function filterCompositedProperties(inputPropertyList, outputPropertyList) {
      var accelerated = [];
      for (var i = 0; i < inputPropertyList.length; i++) {
        if (acceleratedStyles[inputPropertyList[i]])
          accelerated.push(inputPropertyList[i]);
      }
      for (var i = 0; i < outputPropertyList.length; i++) {
        if (acceleratedStyles[outputPropertyList[i]])
          accelerated.push(outputPropertyList[i]);
      }
      return accelerated;
    }

    function updateCWElements() {
      var elementUpdate = {};
      for (var animator in animators) {
        var details = animators[animator];
        var roots = animatedElements[animator];
        if (!roots)
          continue;
        elementUpdate[animator] = [];
        for (var i = 0; i < roots.length; i++) {
          var rootProperties = filterCompositedProperties(details.rootInputProperties, details.rootOutputProperties);
          elementUpdate[animator].push({
            'root': roots[i].root ? {
              'proxy': rootProperties.length ? new CompositorProxy(roots[i].root, rootProperties) : null,
              'styleMap': getProperties(roots[i].root, details.inputProperties)} : null,
            'children': [],
          });
          for (var j = 0; j < roots[i].children.length; j++) {
            var properties = filterCompositedProperties(details.inputProperties, details.outputProperties);
            elementUpdate[animator][i].children.push({
              'proxy': properties.length ? new CompositorProxy(roots[i].children[j], properties) : null,
              'styleMap': getProperties(roots[i].children[j], details.inputProperties),
            });
          }
        }
      }
      cw.postMessage({'type': 'updateElements', 'elements': elementUpdate});
    };

    function importOnCW(src) {
      return get(src).then(function(response) {
        return new Promise(function(resolve, reject) {
          var nextId = awaitingPromises.length;
          awaitingPromises[nextId] = {'resolve': resolve, 'reject': reject};
          cw.postMessage({'type': 'import', 'src': src, 'content': response, 'id': nextId});
        });
      });
    }

    return {
      'import': importOnCW,
    };
  };

  function updateElements() {
    animatedElements = {};
    var elements = document.getElementsByTagName("*");
    for (var i = 0; i < elements.length; ++i) {
      var elem = elements[i];
      var animator = getComputedStyle(elem).getPropertyValue('--animator');
      // TODO(flackr): This is a hack for not getting inherited animator properties.
      var parentAnimator = elem.parentElement && getComputedStyle(elem.parentElement).getPropertyValue('--animator');
      if (animator && animator != parentAnimator) {
        animator = animator.trim().split(/\s+/);
        if (animator.length != 2)
          throw new Error('Expected animator name and slot');
        var animatorName = animator[0];
        var animatorSlot = animator[1];
        animatedElements[animatorName] = animatedElements[animatorName] || [{root: undefined, elements: {}}];
        animatedElements[animatorName][0].elements[animatorSlot] = animatedElements[animatorName][0].elements[animatorSlot] || [];
        animatedElements[animatorName][0].elements[animatorSlot].push(elem);
      }

      var animatorRoot = getComputedStyle(elem).getPropertyValue('--animator-root');
      // TODO(flackr): This is a hack for not getting inherited animator properties.
      var parentAnimatorRoot = elem.parentElement && getComputedStyle(elem.parentElement).getPropertyValue('--animator-root');
      if (animatorRoot && animatorRoot != parentAnimatorRoot) {
        animator = animatorRoot.trim().split(/\s+/);
        var animatorName = animator[0];
        var animatorSlot = animator[1];
        // TODO(flackr): Support multiple roots.
        animatedElements[animatorName] = [{root: elem, elements: {}}];
        animatedElements[animatorName][0].elements[animatorSlot] = [elem];
      }
    };
    onElementsUpdated();
  }
  document.addEventListener('DOMContentLoaded', updateElements);

  var MainThreadAnimationWorklet = function() {
    function importOnMain(src) {
      console.warn('Using main thread polyfill of AnimationWorklet, animations will not be performance isolated.');
      return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = function() {
          resolve();
        }
        script.onerror = function() {
          reject(Error('Failed to load ' + src));
        }
        document.body.appendChild(script);
      });
    }

    var ctors = {};
    var animators = {};
    // This is invoked in the worklet to register |name|.
    scope.registerAnimator = function(name, ctor) {
      ctors[name] = ctor;
      var slotMap = {};
      for (var i = 0; i < ctor.elements.length; i++) {
        if (slotMap[ctor.elements[i].name])
          throw new Error('Slot ' + ctor.elements[i].name + ' defined more than once.');
        slotMap[ctor.elements[i].name] = ctor.elements[i];
      }
      animators[name] = {
        'elements': slotMap,
        'timelines': ctor.timelines,
      };
      // TODO(flackr): Do a targeted update of just the added animation worklet.
      updateRunningAnimators();
    };

    class ElementProxy {
      constructor(element, inputProperties, outputProperties) {
        this.inputStyleMap = new ElementInputStyleMap(element, inputProperties);
        this.outputStyleMap = new ElementOutputStyleMap(element, outputProperties);
      }
    };

    class ElementInputStyleMap {
      constructor(element, properties) {
        this.properties_ = {};
        this.element_ = element;
        this.style_ = getComputedStyle(element);
        for (var i = 0; i < properties.length; i++) {
          // Skip copying "accelerated" properties.
          var property = properties[i];
          if (property == 'transform' || property == 'opacity')
            continue;
          this.properties_[property] = this.style_.getPropertyValue(property).trim();
        }
      };

      get(key) {
        if (key == 'opacity')
          return this.style_.opacity;
        if (key == 'transform') {
          return this.style_.transform == 'none' ? new CSSMatrixComponent(new DOMMatrix()) : new CSSMatrixComponent(new DOMMatrix(this.style_.transform));
        }
        return this.properties_[key];
      }
    };

    class ElementOutputStyleMap {
      constructor(element, properties) {
        // TODO(flackr): Restrict output properties based on constructor param.
        this.element_ = element;
        var willChangeString = getComputedStyle(element).willChange
        var willChange = willChangeString == 'auto' ? [] : willChangeString.split(', ');
        for (var i = 0; i < properties.length; i++) {
          var property = properties[i];
          if ((property == 'transform' || property == 'opacity') && willChange.indexOf(property) == -1)
            willChange.push(property);
        }
        if (willChange.length > 0)
          element.style.willChange = willChange.join(', ');
      };

      set(key, val) {
        if (key == 'opacity')
          this.element_.style.opacity = val;
        else if (key == 'transform')
          this.element_.style.transform = val.toString();
        else
          throw new Error('Unsupported output property: ' + key);
      }
    };

    var runningAnimators = {};
    onElementsUpdated = updateRunningAnimators;
    function updateRunningAnimators() {
      runningAnimators = {};
      for (var animator in animators) {
        var details = animators[animator];
        var roots = animatedElements[animator];
        if (!roots)
          continue;
        runningAnimators[animator] = [];
        for (var i = 0; i < roots.length; i++) {
          runningAnimators[animator].push({
            'timelines': [],
            'animator': new ctors[animator](),
            'elementMap': {},
          });
          for (var j = 0; j < details.timelines.length; j++) {
            if (details.timelines[i].type == 'document') {
              runningAnimators[animator][i].timelines.push(new DocumentTimeline(details.timelines[j].options));
            } else if (details.timelines[i].type == 'scroll') {
              var scrollTimelineOptions = JSON.parse(JSON.stringify(details.timelines[j].options));
              scrollTimelineOptions.scrollSource = findNearestOverflow(roots[i].root);
              runningAnimators[animator][i].timelines.push(new ScrollTimeline(scrollTimelineOptions));
            } else {
              console.error('Invalid timeline type ' + details.timelines[i].type);
              runningAnimators[animator][i].timelines.push(undefined);
            }
          }
          var elementMap = {};
          for (var slotName in roots[i].elements) {
            // Elements in unlisted slots are not proxied.
            if (!details.elements[slotName])
              continue;
            elementMap[slotName] = [];
            var inputProperties = details.elements[slotName].inputProperties;
            var outputProperties = details.elements[slotName].outputProperties;
            for (var j = 0; j < roots[i].elements[slotName].length; j++) {
              elementMap[slotName].push(new ElementProxy(roots[i].elements[slotName][j],
                inputProperties, outputProperties));
            }
          }
          runningAnimators[animator][i].elementMap = new ElementProxyMap(elementMap);
        }
      }
    }

    var rafTime = 0;
    function raf(ts) {
      rafTime = ts;
      // TODO(flackr): Check if animators need to be run.
      for (var animator in runningAnimators) {
        for (var i = 0; i < runningAnimators[animator].length; i++) {
          var desc = runningAnimators[animator][i];
          desc.animator.animate(desc.elementMap, desc.timelines);
        }
      }

      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    class ElementProxyMap {
      constructor(map) {
        this.elementMap_ = map;
      }

      get(key) { return this.elementMap_[key]; }
    }

    class DocumentTimeline {
      constructor(options) {
        this.originTime = options.originTime || 0;
      }

      get currentTime() {
        return Math.max(0, rafTime - this.originTime);
      }
    }

    function calculateScrollOffset(scrollSource, position) {
      // TODO(flackr): Optimize this to not do string parsing every time it's
      // queried.
      if (position.endsWith('px')) {
        return parseFloat(position.substring(0, position.length - 2));
      } else if (position.endsWith('%')) {
        var viewHeight = scrollSource == document.scrollingElement ? window.innerHeight : scrollSource.clientHeight;
        return (scrollSource.scrollHeight - viewHeight) * (parseFloat(position.substring(0, position.length - 1)) / 100);
      } else {
        throw new Error('Unhandled scroll position: ' + position);
      }
    }

    function findNearestOverflow(element) {
      while (element) {
        if (getComputedStyle(element).overflow != 'visible')
          return element;
      // TODO(flackr): This should follow standard containing block rules.
        element = element.parentElement;
      }
      return document.scrollingElement;
    }

    class ScrollTimeline {
      constructor(options) {
        this.scrollSource_ = options.scrollSource;
        // TODO(flackr): Use requested orientation instead of assuming vertical.
        this.orientation_ = options.orientation || 'auto';
        this.startScrollOffset_ = options.startScrollOffset || 'auto';
        this.endScrollOffset_ = options.endScrollOffset || 'auto';
        // TODO(flackr): Compute auto timerange from the length of the "animation"?
        this.timeRange_ = (!options.timeRange || options.timeRange == 'auto') ? 1 : options.timeRange;
        this.fill_ = options.fill;
      }

      get currentTime() {
        var scrollPos = this.scrollSource_.scrollTop;
        var startOffset = calculateScrollOffset(this.scrollSource_, this.startScrollOffset_ == 'auto' ? '0px' : this.startScrollOffset_);
        var endOffset = calculateScrollOffset(this.scrollSource_, this.endScrollOffset_ == 'auto' ? '100%' : this.endScrollOffset_)
        // TODO(flackr): Respect the timeline's fill mode.
        return Math.min(1, Math.max(0, (scrollPos - startOffset) / (endOffset - startOffset))) * this.timeRange_;
      }
    }

    var animators = {};

    // Polyfill of DOMMatrix if unavailable.
    if (!scope.DOMMatrix) {
      // Note: Only 'matrix(...)' and 'matrix3d(...)' are supported.
      scope.DOMMatrix = function(transformDesc) {
        this.m11 = 1;
        this.m21 = 0;
        this.m31 = 0;
        this.m41 = 0;

        this.m12 = 0;
        this.m22 = 1;
        this.m32 = 0;
        this.m42 = 0;

        this.m13 = 0;
        this.m23 = 0;
        this.m33 = 1;
        this.m43 = 0;

        this.m14 = 0;
        this.m24 = 0;
        this.m34 = 0;
        this.m44 = 1;

        if (transformDesc && typeof(transformDesc) == 'string') {
          if (transformDesc.startsWith('matrix(')) {
            var values = transformDesc.substring(7, transformDesc.length - 1).split(', ').map(parseFloat);
            if (values.length != 6)
              throw new Error('Unable to parse transform string: ' + transformDesc);
            this.m11 = values[0];
            this.m12 = values[1];
            this.m21 = values[2];
            this.m22 = values[3];
            this.m41 = values[4];
            this.m42 = values[5];
          } else if (transformDesc.startsWith('matrix3d(')) {
            var values = transformDesc.substring(9, transformDesc.length - 1).split(', ').map(parseFloat);
            if (values.length != 16)
              throw new Error('Unable to parse transform string: ' + transformDesc);
            this.m11 = values[0];
            this.m12 = values[1];
            this.m13 = values[2];
            this.m14 = values[3];

            this.m21 = values[4];
            this.m22 = values[5];
            this.m23 = values[6];
            this.m24 = values[7];

            this.m31 = values[8];
            this.m32 = values[9];
            this.m33 = values[10];
            this.m34 = values[11];

            this.m41 = values[12];
            this.m42 = values[13];
            this.m43 = values[14];
            this.m44 = values[15];
          } else {
            throw new Error('Unable to parse transform string: ' + transformDesc);
          }
        }
      };

      scope.DOMMatrix.prototype = {
        toString: function(element) {
          return 'matrix3d(' +
              this.m11 + ', ' + this.m12 + ', ' + this.m13 + ', ' + this.m14 + ', ' +
              this.m21 + ', ' + this.m22 + ', ' + this.m23 + ', ' + this.m24 + ', ' +
              this.m31 + ', ' + this.m32 + ', ' + this.m33 + ', ' + this.m34 + ', ' +
              this.m41 + ', ' + this.m42 + ', ' + this.m43 + ', ' + this.m44 + ')';
        },
      };
    }

    return {
      'import': importOnMain,
    }
  };

  class CSSTransformValue {
    constructor(transformList) {
      this.transformList_ = transformList;
    }

    toString() {
      return this.transformList_.map(t => {return t.toString(); }).join(' ');
    }
  };
  class CSSTranslation {
    constructor(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.is2D = this.z === undefined;
    }

    get matrix() {
      throw new Error('matrix not yet supported on translation');
    }

    toString() {
      if (this.is2D) {
        // TODO(flackr): Produce translateX or translateY if a component is 0.
        return 'translate(' + this.x.toString() + ', ' + this.y.toString() + ')';
      }
      return 'translate3d(' + this.x.toString() + ', ' + this.y.toString() + ', ' + this.z.toString() + ')';
    }
  };
  class CSSScale {
    constructor(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.is2D = this.z === undefined;
    }

    get matrix() {
      throw new Error('matrix not yet supported on translation');
    }

    toString() {
      if (this.is2D)
        return 'scale(' + this.x + ', ' + this.y + ')';
      return 'scale3d(' + this.x + ', ' + this.y + ', ' + this.z + ')';
    }
  };
  class CSSSimpleLength {
    constructor(value, units) {
      this.value_ = value;
      this.units_ = units;
    }

    toString() {
      return this.value_ + this.units_;
    }
  };
  class CSSMatrixComponent {
    constructor(matrix) {
      this.matrix = matrix;
      // For now, all DOMMatrix constructions convert to 3d.
      this.is2D = false;
    }

    toString() {
      return matrix.toString();
    }
  };
  scope.CSSTransformValue = CSSTransformValue;
  scope.CSSTranslation = CSSTranslation;
  scope.CSSScale = CSSScale;
  scope.CSSSimpleLength = CSSSimpleLength;
  scope.CSSMatrixComponent = CSSMatrixComponent;

  // Minimal Promise implementation for browsers which do not have promises.
  scope.Promise = scope.Promise || function(exec) {
    var then = undefined;
    var resolve = function() {
      if (!then)
        throw new Error('No function specified to call on success.');
      then.apply(null, arguments);
    }.bind(this);
    var reject = function(e) { throw e; };
    this.then = function(fn) { then = fn; };
    exec(resolve, reject);
  };

  scope.String.prototype.startsWith = scope.String.prototype.startsWith || function(s) {
    return this.substring(0, s.length) == s;
  };

  function get(url) {
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      // TODO(flackr): Figure out why we keep getting stale response when using 'GET'.
      req.open('GET', url);

      req.onload = function() {
        if (req.status == 200)
          resolve(req.response);
        else
          reject(Error(req.statusText));
      };

      req.onerror = function() {
        reject(Error("Network error"));
      };

      req.send();
    });
  }

  // TODO(flackr): It seems we can't properly polyfill animationWorklet because it exists with --experimental-web-platform-features and seems to be read-only.
  // TODO(flackr): Get CompositorWorkerAnimationWorklet polyfill working with new API.
  scope.polyfillAnimationWorklet = false && scope.CompositorWorker ? CompositorWorkerAnimationWorklet() : MainThreadAnimationWorklet();
  scope.polyfillAnimationWorklet.updateElements = updateElements;

})(self);