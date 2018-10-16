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

function drawCircle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}


class ClockPainter {
  static get inputProperties() {
    return ['--clock-time', '--clock-from-time'];
  }

  constructor() {
    this.clockHours = 12;
  }

  drawSwoosh(fromTime, toTime) {
    const ctx = this.ctx;
    const fromAngle = 2 * Math.PI * fromTime / this.clockHours - Math.PI / 2;
    const toAngle = 2 * Math.PI * toTime / this.clockHours - Math.PI / 2;
    const x1 = this.numbersRadius * Math.cos(fromAngle);
    const y1 = this.numbersRadius * Math.sin(fromAngle);
    const x2 = this.numbersRadius * Math.cos(toAngle);
    const y2 = this.numbersRadius * Math.sin(toAngle);
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop('0', 'rgba(0, 0, 255, 0)');
    gradient.addColorStop('1', 'rgba(0, 0, 255, 1)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2 * this.dotRadius;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, this.numbersRadius, fromAngle, toAngle);
    ctx.stroke();
  }

  paint(ctx, geom, properties) {
    this.ctx = ctx;
    const xMid = geom.width / 2;
    const yMid = geom.height / 2;
    this.maxRadius = Math.min(xMid, yMid);
    this.dotRadius = 8;
    this.padding = 6;
    this.numbersRadius = this.maxRadius - this.dotRadius - this.padding;

    const clockTime = parseFloat(properties.get('--clock-time').toString());
    const clockFromTime =
        parseFloat(properties.get('--clock-from-time').toString());

    ctx.translate(xMid, yMid);
    drawCircle(ctx, 0, 0, this.maxRadius, '#eee');
    // Draw the hour markers.
    for (let hour = 1; hour <= this.clockHours; hour++) {
      const angle = 2 * Math.PI * hour / this.clockHours - Math.PI / 2;
      const x = this.numbersRadius * Math.cos(angle);
      const y = this.numbersRadius * Math.sin(angle);
      drawCircle(ctx, x, y, this.dotRadius, '#ccc');
    }
    // Draw path trail.
    this.drawSwoosh(clockFromTime, clockTime);

    // Draw the hour hand.
    ctx.save();
    ctx.rotate(2 * Math.PI * clockTime / this.clockHours);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(0, -this.numbersRadius);
    ctx.lineTo(3, 0);
    ctx.lineTo(-3, 0);
    ctx.fill();
    ctx.restore();
    drawCircle(ctx, 0, 0, this.dotRadius, 'blue');
  }
}

registerPaint('clock-painter', ClockPainter);
