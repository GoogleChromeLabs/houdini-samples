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


  function loadScript(src) {
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

  function loadScriptSync(src) {
    return new Promise(function(resolve, reject) {
      document.write('<script src="' + src +'"></script>');
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  var pendingAnimations = {};

  var MainThreadAnimationWorklet = function() {
    var workletInstanceMap = new WeakMap();
    var ctors = {};
    // This is invoked in the worklet to register |name|.
    function registerAnimator(name, ctor) {
      if (ctors[name])
        throw new Error('Animator ' + name + ' is already registered.');
      ctors[name] = ctor;
      if (pendingAnimations[name]) {
        for (var i = 0; i < pendingAnimations[name].length; i++) {
          pendingAnimations[name][i](ctor);
        }
        delete pendingAnimations[name];
      }
    };

    var rafTime = 0;
    var pendingAnimationFrame = null;
    var pendingAnimations = [];
    function updateAnimations(ts) {
      rafTime = ts;
      pendingAnimationFrame = null;
      var animations = pendingAnimations;
      pendingAnimations = [];
      for (var i = 0; i < animations.length; i++) {
        animations[i].updateAnimation_();
      }
    }

    function scheduleUpdateAnimation(animation) {
      pendingAnimations.push(animation);
      if (!pendingAnimationFrame)
        pendingAnimationFrame = requestAnimationFrame(updateAnimations);
    }

    function cancelUpdateAnimation(animation) {
      pendingAnimations.splice(pendingAnimations.indexOf(animation), 1);
      if (pendingAnimations.length == 0) {
        cancelAnimationFrame(pendingAnimationFrame);
        pendingAnimationFrame = null;
      }
    }

    class AbstractTimeline {
      constructor() {
        this.animations_ = [];
        this.currentTime = 0;
      }

      set currentTime(val) {
        this.currentTime_ = val;
      }

      get currentTime() {
        return this.currentTime_;
      }

      attach(animation) {
        // Because attach can be called from the constructor we may not have
        // stored the worklet entry in the WeakMap yet so we run this after a
        // timeout.
        var mainThreadInstance = workletInstanceMap.get(animation);
        if (mainThreadInstance)
          this.attachAdditionalTimelineInternal_(animation, mainThreadInstance);
        else
          setTimeout(this.attach.bind(this, animation), 0);
      }

      detach(animation) {
        // Because detach can be called from the constructor we may not have
        // stored the worklet entry in the WeakMap yet so we run this after a
        // timeout.
        var mainThreadInstance = workletInstanceMap.get(animation);
        if (mainThreadInstance)
          this.detachAdditionalTimelineInternal_(animation, mainThreadInstance);
        else
          setTimeout(this.detach.bind(this, animation), 0);
      }

      attachAdditionalTimelineInternal_(animation, mainThreadInstance) {
        var index = mainThreadInstance.additionalTimelines_.indexOf(this);
        if (index != -1)
          return;
        this.attachInternal_(mainThreadInstance);
        mainThreadInstance.additionalTimelines_.push(this);

        // Attaching to most timelines should not cause an immediate update, but
        // if this is the first DocumentTimeline attached to the animation it
        // may need to schedule an animation frame.
        if (animation instanceof DocumentTimeline)
          animation.setNeedsUpdate_();
      }

      detachAdditionalTimelineInternal_(animation, mainThreadInstance) {
        var index = mainThreadInstance.additionalTimelines_.lastIndexOf(this);
        if (index == -1)
          return;
        this.detachInternal_(mainThreadInstance);
        mainThreadInstance.additionalTimelines_.splice(index, 1);
      }

      attachInternal_(animation, isPrimary) {
        this.animations_.push(animation);
      }

      detachInternal_(animation, isPrimary) {
        var index = this.animations_.lastIndexOf(animation);
        if (index == -1)
          return false;
        this.animations_.splice(index, 1);
        return true;
      }

      setAnimationsNeedUpdate_() {
        for (var i = 0; i < this.animations_.length; i++) {
          this.animations_[i].setNeedsUpdate_();
        }
      }
    }

    class DocumentTimeline extends AbstractTimeline {
      constructor(options) {
        super();
        this.originTime = options && options.originTime || 0;
      }

      get currentTime() {
        return Math.max(0, rafTime - this.originTime);
      }

      set currentTime(val) {
      }
    }

    function getScrollOffsetCalcFunction(position, start) {
      if (position.endsWith('px')) {
        return scrollOffsetConst.bind(null,
            parseFloat(position.substring(0, position.length - 2)));
      } else if (position.endsWith('%')) {
        return scrollOffsetPercent.bind(null,
            Math.max(0, Math.min(1,
                (parseFloat(position.substring(0, position.length - 1)) / 100))));
      } else if (position == 'auto') {
        if (start) {
          return scrollOffsetConst.bind(null, 0);
        } else {
          return scrollOffsetPercent.bind(null, 1);
        }
      } else {
        throw new Error('Unknown scroll position: ' + position);
      }
    }

    function scrollOffsetConst(offset, scrollSource) {
      return offset;
    }

    function scrollOffsetPercent(percent, scrollSource) {
      var viewHeight = scrollSource == document.scrollingElement ? window.innerHeight : scrollSource.clientHeight;
      return (scrollSource.scrollHeight - viewHeight) * percent;
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

    var SCROLL_IDLE_TIMEOUT = 150;

    class ScrollTimeline extends AbstractTimeline {
      constructor(options) {
        super();
        this.scrollSource_ = options.scrollSource;
        // TODO(flackr): Use requested orientation instead of assuming vertical.
        this.orientation_ = options.orientation || 'auto';
        this.startScrollOffsetFunc_ = getScrollOffsetCalcFunction(options.startScrollOffset || 'auto', true);
        this.endScrollOffsetFunc_ = getScrollOffsetCalcFunction(options.endScrollOffset || 'auto', false);
        // TODO(flackr): Compute auto timerange from the length of the "animation"?
        this.timeRange_ = (!options.timeRange || options.timeRange == 'auto') ? 1 : options.timeRange;
        this.fill_ = options.fill;
        this.trackPhase_ = !!options.phase;
        this.phase = this.trackPhase_ ? 'idle' : undefined;
        this.activeScrollEndTimer_ = null;
        this.touchScrolling_ = false;
        this.currentTime = 0;
        this.updateTime_();
        this.scrollSource_.addEventListener('scroll', this.onScroll_.bind(this));
        if (this.trackPhase_) {
          this.scrollSource_.addEventListener('touchstart', this.onTouchStart_.bind(this), {'passive': true});
          this.scrollSource_.addEventListener('touchend', this.onTouchEnd_.bind(this), {'passive': true});
        }
      }

      updateTime_() {
        var scrollPos = this.scrollSource_.scrollTop;
        var startOffset = this.startScrollOffsetFunc_(this.scrollSource_);
        var endOffset = this.endScrollOffsetFunc_(this.scrollSource_);
        // TODO(flackr): Respect the timeline's fill mode.
        this.currentTime = Math.min(1, Math.max(0, (scrollPos - startOffset) / (endOffset - startOffset))) * this.timeRange_;
      }

      needsUpdate_() {
        var oldTime = this.currentTime;
        this.updateTime_();
        return oldTime != this.currentTime;
      }

      onTouchStart_() {
        this.touchScrolling_ = true;
      }

      onTouchEnd_() {
        this.touchScrolling_ = false;
        // We need to wait in case a fling has started, but if no more scroll events
        // come we can consider the scroll to have ended.
        this.startActiveScrollTimeout_();
      }

      startActiveScrollTimeout_() {
        if (this.activeScrollEndTimer_)
          clearTimeout(this.activeScrollEndTimer_);
        this.activeScrollEndTimer_ = setTimeout(this.onScrollIdle_.bind(this), SCROLL_IDLE_TIMEOUT);
      }

      onScrollIdle_() {
        this.activeScrollEndTimer_ = null;
        this.phase = 'idle';
        this.setAnimationsNeedUpdate_();
      }

      onScroll_() {
        var stateChanged = this.needsUpdate_();
        if (this.trackPhase_ && this.phase != 'active') {
          this.phase = 'active';
          stateChanged = true;
          if (!this.touchScrolling_)
            this.startActiveScrollTimeout_();
        }
        if (!stateChanged)
          return false;
        this.setAnimationsNeedUpdate_();
      }
    }

    class KeyframeEffect {
      constructor(target, keyframes, options) {
        this.effect_ = scope.webAnimations1.KeyframeEffect(target, keyframes, options);
        var changes = [];
        var propMap = {};
        for (var i = 0; i < keyframes.length; i++) {
          for (var property in keyframes[i]) {
            if (!propMap[property]) {
              propMap[property] = true;
              changes.push(property);
            }
          }
        }
        this.willChange_ = changes.join(' ');
      }

      set localTime(value) {
        this.effect_._update(value);
        this.effect_();
      }
    }

    class WorkletGroupEffect {
      constructor(effects) {
        this.children = effects;
      }
    }

    class WorkletAnimation {
      constructor(name, effects, timeline, options) {
        this.playState = 'idle';
        this.effect = effects instanceof Array ? new WorkletGroupEffect(effects) : effects;
        this.timeline = timeline;
        this.options = options;
        this.needsUpdate_ = false;
        this.instance_ = null;
        // This stores additional timelines which have been attached.
        this.additionalTimelines_ = []
        if (ctors[name]) {
          this.constructInstance_(ctors[name]);
        } else {
          // If the animator has not been registered yet, save this on a list of
          // pending animations to instantiate.
          pendingAnimations[name] = pendingAnimations[name] || [];
          pendingAnimations[name].push(this.constructInstance_.bind(this));
        }
      }

      play() {
        // Inform the timelines to invalidate this animation and set needs
        // update.
        if (this.timeline)
          this.timeline.attachInternal_(this);

        // Set will-change on all of the animated properties.
        var effects = this.effects_();
        for (var i = 0; i < effects.length; i++) {
          effects[i].effect_._target.style.willChange = effects[i].willChange_;
        }
        if (this.instance_) {
          // TODO(flackr): Maybe this should go through pending state until the
          // first update?
          this.playState = 'running';
          this.setNeedsUpdate_();
        } else {
          this.playState = 'pending';
        }
      }

      cancel() {
        if (this.timeline)
          this.timeline.detachInternal_(this);

        for (var i = this.additionalTimelines_.length - 1; i >= 0; --i) {
          this.additionalTimelines_[i].detachInternal_(this);
        }
        this.additionalTimelines_ = [];
        var effects = this.effects_();
        for (var i = 0; i < effects.length; i++) {
          effects[i].effect_._target.style.willChange = '';
        }
        this.playState = 'idle';
        delete this.instance_;
        if (this.needsUpdate_);
          cancelUpdateAnimation(this);
      }

      constructInstance_(ctor) {
        this.instance_ = new ctor(this.options);
        // Save a map from instance back to this worklet animation without
        // exposing it to the user script.
        workletInstanceMap.set(this.instance_, this);
        if (this.playState == 'pending') {
          this.playState = 'running';
          this.setNeedsUpdate_();
        }
      }

      effects_() {
        if (this.effect instanceof WorkletGroupEffect)
          return this.effect.children;
        return [this.effect];
      }

      getCurrentTime_(timelineTime) {
        // Don't offset scroll timeline's current time.
        if (this.timeline instanceof ScrollTimeline) {
          return this.timeline.currentTime;
        }

        if (typeof this.startTime_ == "undefined")
          this.startTime_ = this.timeline.currentTime;

        return this.timeline.currentTime - this.startTime_;
      }

      setNeedsUpdate_() {
        if (this.playState != 'running' ||
            this.needsUpdate_) return;
        this.needsUpdate_ = true;
        scheduleUpdateAnimation(this);
      }

      updateAnimation_() {
        this.instance_.animate(this.getCurrentTime_(), this.effect);
        this.needsUpdate_ = false;
        // If this animation has any document timelines it will need an update
        // next frame.
        if (this.timeline instanceof DocumentTimeline)
          this.setNeedsUpdate_();
        for (var i = 0; i < this.additionalTimelines_.length; i++) {
          if (this.additionalTimelines_[i] instanceof DocumentTimeline) {
            this.setNeedsUpdate_();
            break;
          }
        }
      }
    }

    class AnimationWorklet {
      addModule(url) {
        console.warn('Using main thread polyfill of AnimationWorklet, animations will not be performance isolated.');
        return loadScript(url);
      }
    }

    function redefineGetter(obj, prop, value) {
      Object.defineProperty(obj, prop, {
        configurable: true,
        get: function() { return value; }
      });
    }


    // Returns true if AnimationWorklet is natively supported.
    function hasNativeSupport() {
      for (var namespace of [scope, scope.CSS]) {
        if (namespace.animationWorklet && namespace.animationWorklet.addModule)
          return true;
      }
      return false;
    }

    function exportSymbols(window) {
      function _export(){
        window.registerAnimator = registerAnimator;

        window.WorkletAnimationKeyframeEffect = KeyframeEffect;
        window.WorkletAnimation = WorkletAnimation;
        window.ScrollTimeline = ScrollTimeline;
        window.DocumentTimeline = DocumentTimeline;
        // Replace default keyframe effect with animation worklet version, and
        // document timeline with our version.
        window.KeyframeEffect = window.WorkletAnimationKeyframeEffect;
        redefineGetter(window.document, 'timeline', new DocumentTimeline())

        redefineGetter(window.CSS, 'animationWorklet', new AnimationWorklet())
      }

      // Ensure the WebAnimations polyfill is loaded.
      if (!window.webAnimations1) {
        return loadScriptSync('https://rawgit.com/web-animations/web-animations-js/master/web-animations-next.dev.js').then(_export);
      } else {
        return Promise.resolve(_export());
      }
    }

    var loadPromise_;
    // Export polyfill symbols to the scope and return a promise
    //
    // isForced controls the behavior if native implementation is present.
    // 'false': This is the default value and it means that we do not
    // override native implementation if it is present.
    // 'true': Means polyfill should export its symbols overwriting native
    // implementation. This is useful if your demo depends on AnimationWorklet
    // features that are not yet implemented (e.g., multiple timeline, or
    // multiple effects)
    function load(isForced) {
      if (!isForced && hasNativeSupport()) {
        // ensure AW is always present in CSS namespace.
        if (!scope.CSS.animationWorklet)
          scope.CSS.animationWorklet = scope.animationWorklet;
        return Promise.resolve();
      }

      loadPromise_ = loadPromise_ || exportSymbols(scope);
      return loadPromise_;
    }

    return {
      'load': load,
    };
  };

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


  // Create scope.CSS if it does not exist.
  scope.CSS = scope.CSS || {};

  // Create a polyfill instance but don't export any of its symbols.
  scope.animationWorkletPolyfill = MainThreadAnimationWorklet();

  scope.animationWorkletPolyfill.load();
})(self);