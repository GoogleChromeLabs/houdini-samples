class BorderRadiusReversePainter {
    static get inputProperties(){
        return ['--border-radius-reverse', '--border-radius-reverse-color']
    }

    clearCircle(context,x,y,radius) {
        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, 2*Math.PI, true);
        context.clip();
        context.clearRect(x - radius,y - radius,radius*2,radius*2);
        context.restore();
    }

    paint(ctx, geom, props){
        const radiusValue = Number(props.get('--border-radius-reverse').toString())

        ctx.fillStyle = props.get('--border-radius-reverse-color').toString();
        ctx.fillRect(0, 0, geom.width, geom.height);

        this.clearCircle(ctx, 0, 0, radiusValue) // Left top
        this.clearCircle(ctx, geom.width, geom.height, radiusValue) // Right bottom
        this.clearCircle(ctx, 0, geom.height, radiusValue) // Left bottom
        this.clearCircle(ctx, geom.width, 0, radiusValue) // Right top
    }
}

registerPaint('border-radius-reverse', BorderRadiusReversePainter);
