registerPaint('tooltip', class {
  static get inputProperties() {
    return [
      '--round-radius',  // optional, number, default to 5
      '--background-color',  // color string, default '#ddd'
      '--triangle-size',  // number, default 20. The long edge length.
      '--position',  // string | number, default 'center' (50), the percentage of the center point on the edge
      '--direction',  // top|bottom|left|right, default 'left'
      '--border-color',  // color string, default no border
      '--border-width',  // number, default 0
    ];
  }
  paint(ctx, geom, properties) {
    // default values
    const DEFAULT_RADIUS = 5;
    const DEFAULT_BACKGROUND = '#fff';
    const DEFAULT_TRIANGLE_SIZE = 16;
    const DEFAULT_DIRECTION = 'left';
    const DEFAULT_POSITION = 50;
    const DEFAULT_BORDER_WIDTH = 0;
    const DEFAULT_BORDER_COLOR = '#000';

    // get shape vars
    const radius = isNaN(parseFloat(properties.get('--round-radius').toString())) ? DEFAULT_RADIUS : parseFloat(properties.get('--round-radius').toString());
    const bgColor = properties.get('--background-color').toString() || DEFAULT_BACKGROUND;
    
    // get border vars
    const borderColor = properties.get('--border-color').toString() || DEFAULT_BORDER_COLOR;
    const borderWidth = parseFloat(properties.get('--border-width').toString() || DEFAULT_BORDER_WIDTH);

    // get position vars
    const direction = properties.get('--direction').toString().trim() || DEFAULT_DIRECTION;
    const triangleSize = parseFloat(properties.get('--triangle-size').toString()) || DEFAULT_TRIANGLE_SIZE;
    const positionValue = properties.get('--position').toString().trim() || DEFAULT_POSITION;

    // calculate positions
    const trianglePosition = (positionValue === 'center' ? 50 : parseFloat(positionValue)) / 100 *
                             (direction === 'top' || direction === 'bottom' ? geom.width: geom.height);
    const triangle = [];
    const rect = {};
    switch(direction) {
      case 'top':
        rect.width = geom.width - 2 * borderWidth;
        rect.height = geom.height - triangleSize * .6 - 2 * borderWidth;
        rect.x = borderWidth;
        rect.y = triangleSize * .6 + borderWidth;
        triangle[0] = {x: trianglePosition - triangleSize / 2, y: triangleSize * .6 + borderWidth};
        triangle[1] = {x: trianglePosition, y: 0};
        triangle[2] = {x: trianglePosition + triangleSize / 2, y: triangleSize * .6 + borderWidth};
        break;
      case 'bottom':
        rect.width = geom.width - 2 * borderWidth;
        rect.height = geom.height - triangleSize * .6 - 2 * borderWidth;
        rect.x = borderWidth;
        rect.y = borderWidth;
        triangle[0] = {x: trianglePosition - triangleSize / 2, y: geom.height - triangleSize * .6 - borderWidth};
        triangle[1] = {x: trianglePosition, y: geom.height};
        triangle[2] = {x: trianglePosition + triangleSize / 2, y: geom.height - triangleSize * .6 - borderWidth};
        break;
      case 'right':
        rect.width = geom.width - triangleSize * .6 - 2 * borderWidth;
        rect.height = geom.height - 2 * borderWidth;
        rect.x = borderWidth;
        rect.y = borderWidth;
        triangle[0] = {x: geom.width - triangleSize * .6 - borderWidth, y: trianglePosition - triangleSize / 2};
        triangle[1] = {x: geom.width, y: trianglePosition};
        triangle[2] = {x: geom.width - triangleSize * .6 - borderWidth, y: trianglePosition + triangleSize / 2};
        break;
      default:
        rect.width = geom.width - triangleSize * .6 - 2 * borderWidth;
        rect.height = geom.height - 2 * borderWidth;
        rect.x = triangleSize * .6 + borderWidth;
        rect.y = borderWidth;
        triangle[0] = {x: triangleSize * .6 + borderWidth, y: trianglePosition - triangleSize / 2};
        triangle[1] = {x: 0, y: trianglePosition};
        triangle[2] = {x: triangleSize * .6 + borderWidth, y: trianglePosition + triangleSize / 2};
    }

    // setup canvas context
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    // draw
    this.drawRoundRect(ctx, rect, radius);
    ctx.fill();
    if (borderWidth) {
      ctx.stroke();
      this.coverOverlappingBorder(ctx, triangle, borderWidth, bgColor, borderColor);
    }
    ctx.lineCap = 'round';
    this.drawTriangle(ctx, triangle);
    ctx.fill();
    if (borderWidth) {ctx.stroke();}
  }

  // rounded corner rect inspired by http://js-bits.blogspot.com/2010/07/canvas-rounded-corner-rectangles.html
  drawRoundRect(ctx, rect, radius) {
    if (typeof radius === "undefined") {
      radius = 5;
    }
    ctx.beginPath();
    ctx.moveTo(rect.x + radius, rect.y);
    ctx.lineTo(rect.x + rect.width - radius, rect.y);
    ctx.quadraticCurveTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + radius);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height - radius);
    ctx.quadraticCurveTo(rect.x + rect.width, rect.y + rect.height, rect.x + rect.width - radius, rect.y + rect.height);
    ctx.lineTo(rect.x + radius, rect.y + rect.height);
    ctx.quadraticCurveTo(rect.x, rect.y + rect.height, rect.x, rect.y + rect.height - radius);
    ctx.lineTo(rect.x, rect.y + radius);
    ctx.quadraticCurveTo(rect.x, rect.y, rect.x + radius, rect.y);
    ctx.closePath();
  }

  drawTriangle(ctx, triangle) {
    ctx.beginPath();
    ctx.moveTo(triangle[0].x, triangle[0].y);
    ctx.lineTo(triangle[1].x, triangle[1].y);
    ctx.lineTo(triangle[2].x, triangle[2].y);
  }

  coverOverlappingBorder(ctx, triangle, borderWidth, bgColor, borderColor) {
    // Set it to covering color
    ctx.strokeStyle = bgColor;
    // Set it slightly wider than the border to totally cover it.
    ctx.lineWidth = borderWidth + 1;
    ctx.beginPath();
    ctx.moveTo(triangle[0].x, triangle[0].y);
    ctx.lineTo(triangle[2].x, triangle[2].y);
    ctx.stroke();
    // Reset it back
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
  }
});