registerPaint('demo', class {
  static get inputProperties() { return ['--top-width', '--top-height']; }

  paint(ctx, geom, properties) {
    const topWidthPerc = parseInt(properties.get('--top-width').toString());
    const topHeightPerc = parseInt(properties.get('--top-height').toString());
    ctx.beginPath();
    ctx.fillStyle = 'black';
    const topWidth = geom.width * topWidthPerc/100;
    const left = (geom.width - topWidth)/ 2;
    ctx.moveTo(left, 0);
    ctx.lineTo(geom.width - left, 0);
    ctx.lineTo(geom.width, geom.height * topHeightPerc/100);
    ctx.lineTo(geom.width / 2, geom.height);
    ctx.lineTo(0, geom.height * topHeightPerc/100);
    ctx.closePath();
    ctx.fill();
  }
});
