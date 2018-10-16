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

class ClockPainter {
  static get inputProperties() {
    return ['--clock-time', '--clock-from-time'];
  }

  paint(ctx, geom, properties) {
    const xMid = geom.width / 2;
    const yMid = geom.height / 2;
    const maxRadius = Math.min(xMid, yMid);
    const clockHours = 12;
    const dotRadius = 8;
    const padding = 6;
    const numbersRadius = maxRadius - dotRadius - padding;

    const clockTime = parseFloat(properties.get('--clock-time').toString());
    const clockFromTime =
        parseFloat(properties.get('--clock-from-time').toString());

    const drawCircle = function(x, y, r, fill) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    };

    const drawArc = function(fromTime, toTime) {
      const fromAngle = 2 * Math.PI * fromTime / clockHours - Math.PI / 2;
      const toAngle = 2 * Math.PI * toTime / clockHours - Math.PI / 2;
      const x1 = numbersRadius * Math.cos(fromAngle);
      const y1 = numbersRadius * Math.sin(fromAngle);
      const x2 = numbersRadius * Math.cos(toAngle);
      const y2 = numbersRadius * Math.sin(toAngle);
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop('0', 'rgba(0, 0, 255, 0)');
      gradient.addColorStop('1', 'rgba(0, 0, 255, 1)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2 * dotRadius;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, numbersRadius, fromAngle, toAngle);
      ctx.stroke();
    }

    ctx.translate(xMid, yMid);
    drawCircle(0, 0, maxRadius, '#eee');
    // Draw the hour markers.
    for (let hour = 1; hour <= clockHours; hour++) {
      const angle = 2 * Math.PI * hour / clockHours - Math.PI / 2;
      const x = numbersRadius * Math.cos(angle);
      const y = numbersRadius * Math.sin(angle);
      drawCircle(x, y, dotRadius, '#ccc');
    }
    // Draw path trail.
    drawArc(clockFromTime, clockTime);

    // Draw the hour hand.
    ctx.save();
    ctx.rotate(2 * Math.PI * clockTime / clockHours);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(0, -numbersRadius);
    ctx.lineTo(3, 0);
    ctx.lineTo(-3, 0);
    ctx.fill();
    ctx.restore();
    drawCircle(0, 0, dotRadius, 'blue');
  }
}

registerPaint('clock-painter', ClockPainter);
