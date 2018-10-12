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

class RingPainter {
  static get inputProperties() {
    return ['--comet-head-degrees', '--comet-tail-degrees'];
  }

  paint(ctx, geom, properties) {
    const xMid = geom.width / 2;
    const yMid = geom.height / 2;
    const radius = Math.min(xMid, yMid) * 0.7;
    const degreesToRadians = Math.PI / 180;
    const cometHeadDegrees =
        parseFloat(properties.get('--comet-head-degrees').toString());
    const cometTailDegrees =
        parseFloat(properties.get('--comet-tail-degrees').toString());

    const startAngle = degreesToRadians * cometTailDegrees;
    const endAngle = degreesToRadians * cometHeadDegrees;

    ctx.lineWidth = 6;
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(xMid, yMid, radius, startAngle, endAngle, false);
    ctx.stroke();
  }
}

registerPaint('ring-painter', RingPainter);
