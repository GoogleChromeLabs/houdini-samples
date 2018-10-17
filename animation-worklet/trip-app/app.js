function loadListPageAnimations() {
    const list = document.getElementById('list');
    const rows = list.querySelectorAll('.row_container');
    for (let i = 0; i < rows.length; i++) {
        createRowAnimations(rows[i]);
    }
}

function loadInfoPageAnimations() {
    const tabs = document.getElementById('tabs');
    const scrollRange = tabs.scrollWidth - tabs.clientWidth;
    const scrollTimeline = new ScrollTimeline({
        scrollSource: tabs, orientation: 'inline',
        timeRange: scrollRange
    });

    const offsets = Array.prototype.map.call(
        tabs.querySelectorAll('li'), tab => { return tab.offsetLeft - 40 /* margin */})
    console.log(offsets)
    createImageAnimations(scrollTimeline, offsets, tabs.clientWidth);
    createIndicatorAnimation(scrollTimeline);
}

// Create a swipe-to-action effect for each row. The effects involves 3
// animations:
// 1. icon scale: icon is scalled as user swipes right until threshold is
//    reached
// 2. background scale: a small yellow circle in the background is scaled up to
//    cover the background as user swipes right. The circle fully covers when
//    threshold is reached.
// 3. icon move to corner: icon is translated to top-left corner as user
//    releases and row snaps back
function createRowAnimations(row_container) {
    const row = row_container.querySelector('.row');
    const icon = row_container.querySelector('.icon');
    const entry = row.querySelector('.entry');
    // scroll  little bit to trigger initial snapping.
    row.scrollTo(1, 0);

    const scrollRange = row.scrollWidth - row.clientWidth;
    const scrollTimeline = new ScrollTimeline({ scrollSource: row, orientation: 'inline', timeRange: scrollRange });

    const iconLeft = icon.offsetLeft;
    const iconTop = icon.offsetTop;

    // Set threshold at 40%.
    const threshold = entry.clientWidth * 0.4;
    const options = {
        start: entry.offsetLeft,
        width: threshold,
    };

    const scale_effect = new KeyframeEffect(
        icon.querySelector('svg'),
        {
            transform: ['scale(0.5)', 'scale(1)'],
            opacity: [0, 1]
        },
        { duration: 50, delay: 50, iterations: 1, fill: 'both', easing: 'linear' });

    const scale_options = {
        ...options,
        play_when_favorited: false, // ensure effect is played when swiping right
    };

    const background_scale_effect = new KeyframeEffect(
        row_container.querySelector('.bg'),
        {
            transform: ['scale(0.5)', 'scale(40)'],
            opacity: [0, 1]
        },
        { duration: 70, delay: 30, iterations: 1, fill: 'both', easing: 'linear' });

    const background_scale_options = {
        ...options,
        play_when_favorited: false,
    };

    const transform_effect = new KeyframeEffect(
        icon,
        {
            transform: [`translate(-${iconLeft}px, -${iconTop}px) scale(1)`, 'translate(0,0) scale(1)'],
        },
        { duration: 100, iterations: 1, easing: 'linear' });

    const transform_options = {
        ...options,
        play_when_favorited: true,
    };

    new WorkletAnimation('icon_effect', scale_effect, scrollTimeline, scale_options).play();
    new WorkletAnimation('icon_effect', background_scale_effect, scrollTimeline, background_scale_options).play();
    new WorkletAnimation('icon_effect', transform_effect, scrollTimeline, transform_options).play();
}

// Images have two effects
// 1. parallax: simply translate them as scroll moves. Since their width is
//    different than scroll width this appears as a parallax.
// 2. reveal: achieved by scaling and counter-scaling so the image does not move
//    but its clip is animated.
function createImageAnimations(scrollTimeline, offsets, width) {
    const image_container = document.getElementById('images');

    // FIXME: I am a layout noob! I would have expected that image container
    // clientWidth is sum of width for all images but somehow the container size
    // is the same size as one image. So for now we do the math for 5 images.
    const containerWidth = (2 * 5) * image_container.clientWidth;
    const parallex_effect = new KeyframeEffect(
        image_container,
        { transform: ['translateX(0)', 'translateX(-' + containerWidth + 'px)'] },
        { duration: scrollTimeline.timeRange, iterations: 1, fill: "both" });

    new WorkletAnimation('passthrough', parallex_effect, scrollTimeline).play();


    const figures = image_container.querySelectorAll('figure');
    for (let i = 0; i < figures.length; i++) {
        const figure = figures[i];
        const img = figure.querySelector('img');

        const reveal_effect = new KeyframeEffect(
            figure,
            { transform: ['scale(0.5)', 'scale(1)'] },
            { duration: 100, iterations: 1, fill: "both", easing: 'linear'});
        const options = {
            start: offsets[i],
            width: width,
            inverse: false,
        };

        const inverse_reveal_effect = new KeyframeEffect(
            img,
            { transform: ['scale(1)', 'scale(2)'] },
            { duration: 1, iterations: 1, fill: "both", easing: 'linear'});

        const inverse_options = {
            start: offsets[i],
            width: width,
            inverse: true,
        };

        new WorkletAnimation('image_reveal', reveal_effect, scrollTimeline, options).play();
        new WorkletAnimation('image_reveal', inverse_reveal_effect, scrollTimeline, inverse_options).play();
    }

    // TODO: Create scale and counter-scale reveal animations for each image
}

// function createTabAnimation(scrollTimeline, tab, content) {
//     const effect = new KeyframeEffect(content,
//         {
//             opacity: [1, 0],
//             transform: ['scale3d(1, 1, 1)', 'scale3d(0.9, 0.9, 1)']
//         },
//         { duration: 100, iterations: 1, fill: "both" });
//     // Pass offset left as an option but once we support start and end
//     // scroll offset in ScrollTimeline we can get rid of this.
//     const animation = new WorkletAnimation(
//         'material_tab_swipe', effect, scrollTimeline,
//         { offset: tab.offsetLeft, width: tab.clientWidth });
//     animation.play();
// }

// Indicate animation.
// Simply translate the indicator from first chip to last chip as
// user scrolls.
function createIndicatorAnimation(scrollTimeline) {
    const chip_container = document.querySelector('#info #chips');
    const chips = chip_container.querySelectorAll('li');
    const indicator = document.querySelector('#indicator');
    const width = chips[chips.length - 1].offsetLeft - chips[0].offsetLeft;
    const indicator_effect = new KeyframeEffect(indicator,
        { transform: ['translateX(0px)', 'translateX(' + width + 'px)'] },
        { duration: scrollTimeline.timeRange, iterations: 1, fill: "both" });
    new WorkletAnimation('passthrough', indicator_effect, scrollTimeline).play();
}