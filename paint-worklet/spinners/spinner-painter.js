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
class SpinnerPainter {
  static get inputProperties() {
    return ['--spinner-angle-degrees'];
  }

  paint(ctx, geom, properties) {
    const xMid = geom.width / 2;
    const yMid = geom.height / 2;
    const length = 0.22 * geom.width;
    const numBlades = 12;
    const angleAdvance = -2 * Math.PI / numBlades;
    const degreesToRadians = Math.PI / 180;
    let spinnerAngleDegrees =
        parseFloat(properties.get('--spinner-angle-degrees').toString());
    // Quantize angle.
    spinnerAngleDegrees = 30 * Math.trunc(spinnerAngleDegrees / 30);
    const spinnerAngle = degreesToRadians * spinnerAngleDegrees;

    ctx.translate(xMid, yMid);
    ctx.rotate(spinnerAngle);
    for (let i = 0; i < numBlades; i++) {
      const opacity = 1 - i / numBlades;
      ctx.fillStyle = 'rgba(0, 0, 0,' + opacity + ')';
      ctx.fillRect(-2, 4 - yMid, 5, length);
      ctx.rotate(angleAdvance);
    }
  }
}

registerPaint('spinner-painter', SpinnerPainter);
