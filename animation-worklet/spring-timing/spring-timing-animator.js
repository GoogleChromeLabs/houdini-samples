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
registerAnimator('spring', class SpringAnimator {
  constructor(options) {
    if(!options) {
      console.warn('Initial options was empty. Using a random spring ratio.');
      options = {
        k: 1,
        ratio: 0.1 + Math.random()/2,
        target: 500
      };
    }

    this.options_ = options;
    // initialize the simulation.
    this.springTiming_ =  this.spring(this.options_.k, this.options_.ratio);
  }

  animate(currentTime, effect) {
    // TODO(majidvp): stop computing a new value once we are within a certain
    // threshold of the target.
    const dt_seconds = currentTime / 1000;
    const dy_pixels = this.options_.target * this.springTiming_(dt_seconds);
    effect.localTime = dy_pixels;
  }

  // Based on flutter spring simulation for an under-damped spring:
  // https://github.com/flutter/flutter/blob/cbe650a7e67931c0208a796fc17550e5c436d340/packages/flutter/lib/src/physics/spring_simulation.dart
  spring(springConstant, ratio) {
    // Normalize mass and distance to 1 and assume a reasonable init velocity.
    const velocity = 0.2;
    const mass = 1;
    const distance = 1;

    // Keep ratio < 1 to ensure it is under-damped.
    ratio = Math.min(ratio, 1 - 1e-5);

    const damping = ratio * 2.0 * Math.sqrt(springConstant);
    const w = Math.sqrt(4.0 * springConstant - damping * damping) / (2.0 * mass);
    const r = -(damping / 2.0);
    const c1 = distance;
    const c2 = (velocity - r * distance) / w;

    // return a value in [0..distance]
    return function springTiming(time) {
      const result = Math.pow(Math.E, r * time) *
                    (c1 * Math.cos(w * time) + c2 * Math.sin(w * time));
      return distance - result;
    }
  }

});