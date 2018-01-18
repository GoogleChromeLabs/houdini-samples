registerPaint('demo', class {
  static get inputArguments() { return ['<percentage>', '<percentage>']; }
  
  paint(ctx, geom, properties, args) {
    
    // ctx.filter = `blur(${Math.max(geom.width, geom.height) * 0.005}px)`;
    ctx.beginPath();
    ctx.fillStyle = 'black';
    const topWidth = geom.width * args[0].value/100;
    const left = (geom.width - topWidth)/ 2;
    ctx.moveTo(left, 0);
    ctx.lineTo(geom.width - left, 0);
    ctx.lineTo(geom.width, geom.height * args[1].value/100);
    ctx.lineTo(geom.width / 2, geom.height);
    ctx.lineTo(0, geom.height * args[1].value/100);
    ctx.closePath();
    ctx.fill();
  }
});