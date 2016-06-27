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

"use strict";

var lastTimestamp;
var spheres = [];
var foils = [];
var gravity = 0.022;
var numBlurElements = 1;
var epsilon = 0.01;
var viewportHeight = 0;

function lerp(a, b, t) {
  return (1 - t) * a + t * b;
}

function setPosition(sphere, dt) {
  var dx = sphere.dx + (sphere.vx * dt);
  var dy = sphere.dy + (sphere.vy * dt);
  for (var i = 0; i < numBlurElements; ++i) {
    var t = i / (numBlurElements - 1 || 1);
    var lx = lerp(sphere.dx, dx, 1 - t);
    var ly = lerp(sphere.dy, dy, 1 - t);
    var transform = sphere.blurElements[i].transform;
    transform.m41 = lx;
    transform.m42 = ly;
    sphere.blurElements[i].transform = transform;
  }
  sphere.dx = dx;
  sphere.dy = dy;
}

function updatePositions(dt) {
  for (var i = 0; i < spheres.length; ++i)
    setPosition(spheres[i], dt);
}

function applyGravity(dt) {
  for (var i = 0; i < spheres.length; ++i)
    spheres[i].vy += gravity * dt;
}

var re = /matrix\(.*, ([0-9\.]+)\)/;
function getAnimatedPosition(foil) {
  return foil.actor.transform.m42;
}

function signedDistanceToLine(x1, y1, nx, ny, cx, cy) {
  return (cx - x1) * nx + (cy - y1) * ny;
}

function normalizeBinormalComponent(component) {
  if (component < epsilon && component > -epsilon)
    return 0;
  if (component < 0)
    return -1;
  return 1;
}

function doAABBoxesIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
  if (x1 > x2 + w2)
    return false;

  if (x2 > x1 + w1)
    return false;

  if (y1 > y2 + h2)
    return false;

  if (y2 > y1 + h1)
    return false;

  return true;
}

function collideWithLine(x1, y1, x2, y2, nx, ny, vx, vy, sphere) {
  var cx = sphere.dx + sphere.radius;
  var cy = sphere.dy + sphere.radius;

  var normalDotVelocity = nx * sphere.vx + ny * sphere.vy;
  if (normalDotVelocity > 0)
    return false;

  var distanceToLine = signedDistanceToLine(x1, y1, nx, ny, cx, cy);
  if (Math.abs(distanceToLine) > sphere.radius)
    return false;

  var binormX = normalizeBinormalComponent(x2 - x1);
  var binormY = normalizeBinormalComponent(y2 - y1);

  var distanceToBoundary1 = signedDistanceToLine(x1, y1, binormX, binormY, cx, cy);
  if (distanceToBoundary1 < 0)
    return false;

  var distanceToBoundary2 = signedDistanceToLine(x2, y2, -binormX, -binormY, cx, cy);
  if (distanceToBoundary2 < 0)
    return false;

  // We may have passed through the line. Let's fix that now.
  var correction = sphere.radius - distanceToLine;
  sphere.dx += correction * nx;
  sphere.dy += correction * ny;

  // Update velocity.
  if (Math.abs(nx) > epsilon)
    sphere.vx = vx - sphere.vx;

  if (Math.abs(ny) > epsilon)
    sphere.vy = vy - sphere.vy;

  return true;
}

function collideWithSphere(a, b) {
  if (!doAABBoxesIntersect(
        a.dx, a.dy, a.radius * 2, a.radius * 2,
        b.dx, b.dy, b.radius * 2, b.radius * 2))
    return false;

  var cax = a.dx + a.radius;
  var cay = a.dy + a.radius;
  var cbx = b.dx + b.radius;
  var cby = b.dy + b.radius;

  var deltaX = cax - cbx;
  var deltaY = cay - cby;
  var distance2 = deltaX * deltaX + deltaY * deltaY;

  var minDistance2 = a.radius + b.radius;
  minDistance2 = minDistance2 * minDistance2;
  if (distance2 > minDistance2)
    return false;

  var futureDeltaX = (cax + a.vx * epsilon) - (cbx + b.vx * epsilon);
  var futureDeltaY = (cay + a.vy * epsilon) - (cby + b.vy * epsilon);
  var futureDistance2 = futureDeltaX * futureDeltaX + futureDeltaY * futureDeltaY;

  // If we're not getting closer, bail.
  if (futureDistance2 > distance2)
    return false;

  var distance = Math.sqrt(distance2);
  deltaX /= distance;
  deltaY /= distance;

  var p = 2 * (a.vx * deltaX + a.vy * deltaY - b.vx * deltaX - b.vy * deltaY);
  p /= (a.mass + b.mass);

  a.vx = a.vx - p * b.mass * deltaX;
  a.vy = a.vy - p * b.mass * deltaY;
  b.vx = b.vx + p * a.mass * deltaX;
  b.vy = b.vy + p * a.mass * deltaY;

  // Now we may be intersecting. Let's fix that.
  var deltaDistance = Math.sqrt(minDistance2) - distance;
  var correction = deltaDistance * 0.5;
  a.dx += correction * deltaX;
  a.dy += correction * deltaY;
  b.dx -= correction * deltaX;
  b.dy -= correction * deltaY;

  return true;
}

function collideWithFoil(sphere, foil) {
  if (!doAABBoxesIntersect(
        sphere.dx, sphere.dy, sphere.radius * 2, sphere.radius * 2,
        foil.dx, foil.dy, foil.width, foil.height))
    return;

  var corners = [
    [ foil.dx, foil.dy ],
    [ foil.dx + foil.width, foil.dy ],
    [ foil.dx + foil.width, foil.dy + foil.height ],
    [ foil.dx, foil.dy + foil.height ]
  ];

  for (var i = 0; i < corners.length; ++i) {
    var corner0 = corners[i];
    var corner1 = corners[(i + 1) % corners.length];
    var corner2 = corners[(i + 2) % corners.length];

    var nx = normalizeBinormalComponent(corner1[0] - corner2[0]);
    var ny = normalizeBinormalComponent(corner1[1] - corner2[1]);

    if (collideWithLine(corner0[0], corner0[1], corner1[0], corner1[1], nx, ny, foil.vx, foil.vy, sphere))
      return;
  }

  var corner = Object();
  corner.radius = 0.1;
  corner.mass = 50000; // really big.

  for (var i = 0; i < corners.length; ++i) {
    corner.dx = corners[i][0];
    corner.dy = corners[i][1];
    corner.vx = foil.vx;
    corner.vy = foil.vy;
    if (collideWithSphere(sphere, corner))
      return;
  }
}

function updateFoilProperties(foil) {
  var dy = getAnimatedPosition(foil) + foil.top;
  foil.vy = dy - foil.dy;
  foil.dy = dy;
}

function processCollisions() {
  for (var i = 0; i < foils.length; ++i)
    updateFoilProperties(foils[i]);
  for (var i = 0; i < spheres.length; ++i) {
    for (var j = 0; j < foils.length; ++j)
      collideWithFoil(spheres[i], foils[j]);
    for (var j = i + 1; j < spheres.length; ++j)
      collideWithSphere(spheres[i], spheres[j]);
  }
}

function resetSpheres() {
  for (var i = 0; i < spheres.length; ++i) {
    var sphere = spheres[i];
    var padding = 400;
    if (sphere.dy > viewportHeight + padding) {
      sphere.dx = sphere.initialX;
      sphere.dy = sphere.initialY - 0.5 * viewportHeight;
      sphere.vy = 0;
      sphere.vx *= epsilon;
      if (Math.abs(sphere.vx) > 100)
        sphere.vx = 0;
    }
  }
}

var initialized = false;

function PhysicsWorker() {
}

PhysicsWorker.prototype.onmessage = function(e) {
  initialized = true;
  spheres = e.data.spheres;
  foils = e.data.foils;
  viewportHeight = e.data.viewportHeight;
};

PhysicsWorker.prototype.tick = function(timestamp) {
  if (!initialized) return;
  var dt = 1.0;
  if (lastTimestamp) {
    dt = (timestamp - lastTimestamp) * 60;
  }
  lastTimestamp = timestamp;

  updatePositions(dt);
  processCollisions();
  updatePositions(dt);
  applyGravity(dt);
  resetSpheres();
};

registerCompositorAnimator('physics', PhysicsWorker);
