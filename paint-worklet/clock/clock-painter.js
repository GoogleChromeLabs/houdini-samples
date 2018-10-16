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
    return [
      "--clock-time",
      "--clock-from-time",
      "--clock-background-color",
      "--clock-num-hours",
      "--clock-hand-color",
      "--clock-hand-size",
      "--clock-hour-color",
      "--clock-hour-size",
      "--clock-hour-padding"
    ];
  }

  drawSwoosh(fromTime, toTime) {
    const ctx = this.ctx;
    const fromAngle = (2 * Math.PI * fromTime) / this.numHours - Math.PI / 2;
    const toAngle = (2 * Math.PI * toTime) / this.numHours - Math.PI / 2;
    ctx.strokeStyle = this.handColor;
    ctx.lineWidth = 2 * this.dotRadius;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, this.numbersRadius, fromAngle, toAngle);
    ctx.stroke();
  }

  paint(ctx, geom, properties) {
    this.ctx = ctx;
    const xMid = geom.width / 2;
    const yMid = geom.height / 2;
    this.numHours = properties.get("--clock-num-hours").value;
    const backgroundColor = properties
      .get("--clock-background-color")
      .toString();
    this.handColor = properties.get("--clock-hand-color").toString();
    const hourColor = properties.get("--clock-hour-color").toString();
    const handSize = properties.get("--clock-hand-size").value;
    this.maxRadius = Math.min(xMid, yMid);
    this.dotRadius = properties.get("--clock-hour-size").value;
    this.padding = properties.get("--clock-hour-padding").value;;
    this.numbersRadius = this.maxRadius - this.dotRadius - this.padding;

    const clockTime = parseFloat(properties.get("--clock-time").toString());
    const clockFromTime = parseFloat(
      properties.get("--clock-from-time").toString()
    );

    ctx.translate(xMid, yMid);
    drawCircle(ctx, 0, 0, this.maxRadius, backgroundColor);
    // Draw the hour markers.
    for (let hour = 1; hour <= this.numHours; hour++) {
      const angle = (2 * Math.PI * hour) / this.numHours - Math.PI / 2;
      const x = this.numbersRadius * Math.cos(angle);
      const y = this.numbersRadius * Math.sin(angle);
      drawCircle(ctx, x, y, this.dotRadius, hourColor);
    }
    // Draw path trail.
    this.drawSwoosh(clockFromTime, clockTime);

    // Draw the hour hand.
    ctx.save();
    ctx.rotate((2 * Math.PI * clockTime) / this.numHours);
    ctx.lineWidth = handSize;
    ctx.strokeStyle = this.handColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -this.numbersRadius);
    ctx.stroke();
    drawCircle(ctx, 0, -this.numbersRadius, this.dotRadius, this.handColor);
    ctx.restore();
  }
}

registerPaint("clock-painter", ClockPainter);
