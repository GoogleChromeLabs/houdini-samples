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
class RollerPainter {
  static get inputProperties() {
    return ['--parametric-value'];
  }

  paint(ctx, geom, properties) {
    const xMid = geom.width / 2;
    const yMid = geom.height / 2;
    const radius = Math.min(xMid, yMid) * 0.7;
    const parametricValue =
        parseFloat(properties.get('--parametric-value').toString());

    ctx.fillStyle = 'black';

    // Timing function.
    const timeFunc = function(t) {
        return t * t * (3 - 2 * t);
    };

    const rotationAngle = function(delta) {
      let adjustedParametricValue = parametricValue + delta;
      if (adjustedParametricValue < 0) {
        adjustedParametricValue++;
      } else if (adjustedParametricValue > 1) {
        adjustedParametricValue--;
      }
      return 2 * Math.PI * timeFunc(adjustedParametricValue);
    };

    ctx.translate(xMid, yMid);
    const drawDot = function(x, y, parametricOffset) {
      ctx.save();
      ctx.rotate(rotationAngle(parametricOffset));
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2*Math.PI);
      ctx.fill();
      ctx.restore();
    }

    drawDot(18, 18, 0.03);
    drawDot(13, 22, 0.06);
    drawDot(7, 25, 0.09);
    drawDot(0, 26, 0.12);
    drawDot(-7, 25, 0.15);
    drawDot(-13, 22, 0.18);
    drawDot(-18, 18, 0.21);
    drawDot(-22, 13, 0.24);
  }
}

registerPaint('roller-painter', RollerPainter);
