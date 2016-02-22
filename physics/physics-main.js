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

  var spheres = [];
  var foils = [];
  var numBlurElements = 1;
  var viewportHeight = 0;
  var logo = null;
  var janking = false;
  var logoAngle = 0;
  var logoSpeed = 5;

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
      sphere.blurElements[i].style.transform = "translate3d(" + lx + "px, " + ly + "px, 0px)";
    }
    sphere.dx = dx;
    sphere.dy = dy;
  }

  function updateLogo() {
    logoAngle += logoSpeed;
    while (logoAngle > 360)
      logoAngle -= 360;

    logo.style.webkitTransform = "translateZ(0) rotate(" + logoAngle + "deg)";
  }

  scope.tick = function(timestamp) {
    var dt = 1.0;
    if (scope.lastTimestamp) {
      dt = (timestamp - scope.lastTimestamp) * 60;
    }
    scope.lastTimestamp = timestamp;
    updateLogo();
    scope.requestAnimationFrame(tick);
  }

  function createFoil(dx, dy, width, height, delay) {
    var foilActor = document.createElement("div");
    foilActor.className = "foil";
    foilActor.style.left = dx + "px";
    foilActor.style.top = dy + "px";
    foilActor.style.width = width;
    foilActor.style.height = height;
    foilActor.style.webkitAnimation = "foil-motion 1s " + delay + "ms infinite alternate";
    document.body.appendChild(foilActor);

    var foil = new Object();
    foil.actor = foilActor;
    foil.left = dx;
    foil.top = dy;
    foil.width = width;
    foil.height = height;
    foil.dx = foil.left;
    foil.dy = foil.top;
    foil.vx = 0;
    foil.vy = 0;

    return foil;
  }

  function busySleep(duration) {
    // Lets burn some time in the main thread;
    // up to |duration| ms per frame.
    var timestamp = window.performance.now();
    while (window.performance.now() - timestamp < duration) {}
  }

  function doJank() {
    busySleep(500);
    if (janking)
      window.setTimeout(doJank, 500);
  }

  function startJank() {
    var startButton = document.getElementById("startJank");
    startButton.style.webkitAnimation = "flip-hide 1s 1 forwards";

    var stopButton = document.getElementById("stopJank");
    stopButton.style.webkitAnimation = "flip-show 1s 1 forwards";

    janking = true;

    window.setTimeout(doJank, 16);
  }

  function stopJank() {
    var startButton = document.getElementById("startJank");
    startButton.style.webkitAnimation = "flip-show 1s 1 forwards";

    var stopButton = document.getElementById("stopJank");
    stopButton.style.webkitAnimation = "flip-hide 1s 1 forwards";

    janking = false;
  }

  function toggle() {
    if (janking)
      stopJank();
    else
      startJank();
  }

  function createSphere(radius, topColor, bottomColor, dx, dy) {
    var blurElements = [];
    for (var i = 0; i < numBlurElements; ++i) {
      var blurElement = document.createElement("div");
      blurElement.className = "actor";
      blurElement.style.background = "-webkit-gradient(linear, left top,"
          + "left bottom, color-stop(0%," + topColor + "), color-stop(100%,"
          + bottomColor + "))";
      blurElement.style.width = (radius * 2) + "px";
      blurElement.style.height = (radius * 2) + "px";
      blurElement.style.borderRadius = radius + "px";
      document.body.appendChild(blurElement);
      var t = i / (numBlurElements - 1 || 1);
      blurElement.style.opacity = lerp(0.4, 0.1, t);
      blurElements.push(blurElement);
    }

    var sphere = new Object();
    sphere.blurElements = blurElements;
    sphere.radius = radius;
    sphere.vx = 0;
    sphere.vy = 0;
    sphere.dx = sphere.initialX = dx;
    sphere.dy = sphere.initialY = dy;
    sphere.mass = radius * radius * Math.PI;

    setPosition(sphere, dx, dy);

    spheres.push(sphere);
  }

  function setupSpheres() {
    var widths = [ 50, 10, 12, 30, 25, 10, 40, 10, 15, 10 ];
    var colors = [
      [ "rgba(53,53,255,1)", "rgba(28,41,127,1)" ],
      [ "rgba(255,53,53,1)", "rgba(181,41,41,1)" ],
      [ "rgba(8,160,0,1)",   "rgba(24,102,23,1)" ],
      [ "rgba(219,219,0,1)", "rgba(178,173,41,1)" ]
    ];
    var top = 100;
    var left = 200;

    var numSpheres = 80;
    for (var i = 0; i < numSpheres; ++i) {
      var radius = widths[i % widths.length];
      var colorPair = colors[i % colors.length];
      var noise = i % 2 == 0 ? -5 : 5;
      var dx = left - radius + noise;
      var dy = top - radius * 2;

      createSphere(radius, colorPair[0], colorPair[1], dx, dy);

      top -= (widths[i % widths.length] * 2) + 30;
      if (i == Math.floor(numSpheres/3)) {
        top = 500;
        left = 650;
      } else if (i == Math.floor((numSpheres*2)/3)) {
        top = 200;
        left = 950;
      }
    }
  }

  function setupFoils() {
    var dxs = [ 50, 500, 700 ];
    var dys = [ 150, 600, 300 ];
    var delays = [ 0, 500, 250 ];
    for (var i = 0; i < 3; ++i)
      foils.push(createFoil(dxs[i], dys[i], 300, 30, delays[i]));
  }

  function setupScene() {
    logo = document.getElementById("logo");
    viewportHeight = document.documentElement.clientHeight;

    var container = document.querySelector(".container");
    container.addEventListener("mousedown", function(e) { e.preventDefault(); });
    container.addEventListener("click", toggle);

    setupFoils();
    setupSpheres();
  }

  scope.initWorker = function() {
    self.onmessage = function(e) {
      spheres = e.data.spheres;
      foils = e.data.foils;
      viewportHeight = e.data.viewportHeight;
      requestAnimationFrame(tick);
    }
  };

  scope.initMain = function() {
    setupScene();
    scope.worker = new CompositorWorker("physics-worker.js");

    var message = {
      'spheres': [],
      'foils': [],
      'viewportHeight': viewportHeight
    };

    for (var i = 0; i < spheres.length; ++i) {
      var sphere = spheres[i];
      var sphereProxy = {
        radius: sphere.radius,
        vx: sphere.vx,
        vy: sphere.vy,
        dx: sphere.dx,
        dy: sphere.dy,
        initialX: sphere.initialX,
        initialY: sphere.initialY,
        mass:sphere.mass,
        blurElements: []
      };
      for (var j = 0; j < sphere.blurElements.length; ++j)
        sphereProxy.blurElements.push(new CompositorProxy(sphere.blurElements[j], ['transform']));
      message.spheres.push(sphereProxy);
    }

    for (var i = 0; i < foils.length; ++i) {
      var foil = foils[i];
      var foilProxy = {
        left: foil.left,
        top: foil.top,
        width:foil.width,
        height:foil.height,
        dx:foil.dx,
        dy:foil.dy,
        vx:foil.vx,
        vy:foil.vy,
        actor:new CompositorProxy(foil.actor, ['transform'])
      }
      message.foils.push(foilProxy);
    }

    worker.postMessage(message);
    requestAnimationFrame(tick);
  };

  initMain();
})(self);

