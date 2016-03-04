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

  if (scope.compositorWorklet)
    return;
  
  scope.compositorWorklet = {
    import: function(src) {
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
  }
  
  var ctors = {};
  // This is invoked in the worklet to register |name|.
  scope.registerCompositorAnimator = function(name, ctor) {
    ctors[name] = ctor;
  };
  
  var tickFunctions = [];
  
  function addTickFunction(fn) {
    tickFunctions.push(fn);
    if (tickFunctions.length == 1)
      requestAnimationFrame(raf);
  }
  
  function raf(ts) {
    for (var i = 0; i < tickFunctions.length; i++) {
      tickFunctions[i](ts * .001);
    }
    requestAnimationFrame(raf);
  }
  
  // This is invoked in the main execution context. It creates the main
  // thread's window on |name|.
  scope.CompositorAnimator = function(name, data) {
    function dispatchMessage(listeners, msg) {
      var e = {'data': msg};
      if (this.onmessage)
        this.onmessage(e);
      // Dispatch to listeners.
      for (var i = 0; i < listeners.length; i++) {
        listeners[i](e);
      }
    }

    function addEventListener(listeners, type, listener) {
      if (type !== 'message')
        throw new Error('Only message events are supported.');
      listeners.push(listener);
    }

    function removeEventListener(listeners, type, listener) {
      if (type !== 'message')
        throw new Error('Only message events are supported.');
      for (var i = listeners.length-1; i >= 0; i--) {
        if (listeners[i] == listener) {
          listeners.splice(i, 1);
          break;
        }
      }
    }

    var listeners = [];
    var animatorListeners = [];
    var ctor = ctors[name];
    
    // Create the animator instance, but don't call the constructor yet so
    // that we can wire up post message before running user code.
    var animator = Object.create(ctor.prototype);
    
    this.postMessage = dispatchMessage.bind(animator, animatorListeners);
    this.addEventListener = addEventListener.bind(null, listeners);
    this.removeEventListener = removeEventListener.bind(null, listeners);

    // Define extra properties on animator before calling constructor in case
    // the constructor calls addEventListener or postMessage.
    animator.postMessage = dispatchMessage.bind(this, listeners);
    animator.addEventListener = addEventListener.bind(null, animatorListeners);
    animator.removeEventListener = removeEventListener.bind(null, animatorListeners);
    
    ctor.apply(animator, data);
    
    addTickFunction(animator.tick.bind(animator));
  };
  
  function defineProxiedProperty(compositorProxy, proxiedProperties, property, propertyMap) {
    if (proxiedProperties.indexOf(property) == -1) {
      Object.defineProperty(compositorProxy, property, {
        get: function() { throw Error(property + ' was not proxied during CompositorProxy creation.'); },
        set: function() { throw Error(property + ' was not proxied during CompositorProxy creation.'); },
      });
      return;
    }
    Object.defineProperty(compositorProxy, property, propertyMap);
  }
  
  var proxiableProperties = ['transform', 'opacity', 'scrollLeft', 'scrollTop'];
  scope.CompositorProxy = function(element, properties) {
    if (!element)
      throw new Error('Cannot create CompositorProxy with undefined element.');
    if (!properties || properties.length == 0)
      throw new Error('CompositorProxy must proxy some properties of elements.');
    for (var i = 0; i < properties.length; i++) {
      if (proxiableProperties.indexOf(properties[i]) == -1)
        throw new Error('Cannot proxy property ' + properties[i]);
    }
    defineProxiedProperty(this, properties, 'opacity', {
      get: function() {
        return getComputedStyle(element).opacity;
      },
      set: function(value) {
        element.style.opacity = value;
      },
    });
    defineProxiedProperty(this, properties, 'scrollLeft', {
      get: function() {
        return element.scrollLeft;
      },
      set: function(value) {
        element.scrollLeft = value;
      },
    });
    defineProxiedProperty(this, properties, 'scrollTop', {
      get: function() {
        return element.scrollTop;
      },
      set: function(value) {
        element.scrollTop = value;
      },
    });
    defineProxiedProperty(this, properties, 'transform', {
      get: function() {
        var transformString = getComputedStyle(element).transform;
        if (transformString == 'none')
          return new DOMMatrix();
        return new DOMMatrix(transformString);
      },
      set: function(value) {
        element.style.transform = value.toString();
      },
    });
  }
  
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

})(self);