/*
Copyright 2018 Google, Inc. All Rights Reserved.

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
class RipplePainter {
  static get inputProperties() {
    return ['--ripple'];
  }

  paint(ctx, geom, properties) {
    const xMid = geom.width / 2;
    const yMid = geom.height / 2;
    const ripple = parseFloat(properties.get('--ripple').toString());

    // Timing function.
    const timeFunc = function(t) {
        return t * t * (3 - 2 * t);
    };

    const adjustedParameter = function(delta) {
      let adjustedParametricValue = ripple + delta;
      if (adjustedParametricValue < 0) {
        adjustedParametricValue++;
      } else if (adjustedParametricValue > 1) {
        adjustedParametricValue--;
      }
      return adjustedParametricValue;
    }

    const computeRadius = function(delta) {
      return 8 + 21 * timeFunc(adjustedParameter(delta));
    }

    const drawRipple = function(delta) {
      const radius = computeRadius(delta);
      const opacity = 0.8 * (1 - timeFunc(adjustedParameter(delta)));
      ctx.strokeStyle = 'rgba(0, 0, 0,' + opacity + ')';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.stroke();
    };

    ctx.lineWidth = 4;
    ctx.translate(xMid, yMid);
    drawRipple(0);
    drawRipple(0.5);
  }
}

registerPaint('ripple-painter', RipplePainter);
