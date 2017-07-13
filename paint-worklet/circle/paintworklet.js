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

registerPaint('circle', class {
    static get inputProperties() { return ['--circle-color']; }
    paint(ctx, geom, properties) {
        // Change the fill color.
        const color = properties.get('--circle-color').toString();
        ctx.fillStyle = color;

        // Determine the center point and radius.
        const x = geom.width / 2;
        const y = geom.height / 2;
        const radius = Math.min(x, y);

        // Draw the circle \o/
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
});
