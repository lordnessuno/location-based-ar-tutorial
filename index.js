
// Set this parameter to search for a tradeoff between screenshot quality and speed of execution.
// A lower resolution is fast but low quality.
// An higher resolution is slower but more image quality at the end.
const SCREENSHOT_RESOLUTION = 1280;

window.onload = () => {

    const button = document.querySelector('button');
    document.querySelector('a-scene').setAttribute('screenshot', { width: SCREENSHOT_RESOLUTION, height: SCREENSHOT_RESOLUTION});
    let screenshot = document.querySelector("a-scene").components.screenshot;
    
    button.addEventListener('click', () => {
        let frame = captureVideoFrame("video", "png");
        let aScene = screenshot.getCanvas('perspective');
        aScene = resizeCanvas(aScene, frame.width, frame.height)
        frame = frame.dataUri;
        location.reload();
	    mergeImages([frame, aScene]).then(b64 => {
            const link = document.getElementById('image-link');
            link.setAttribute("download", "AR.png");
            link.setAttribute("href", b64);
            link.click();
        });
});

function resizeCanvas(origCanvas, width, height) {
    let resizedCanvas = document.createElement("canvas");
	let resizedContext = resizedCanvas.getContext("2d");

	resizedCanvas.height = height;
	resizedCanvas.width = width;

    resizedContext.drawImage(origCanvas, 0, 0, width, height);
	return resizedCanvas.toDataURL();
}

function captureVideoFrame(video, format, width, height) {
    if (typeof video === 'string') {
        video = document.querySelector(video);
    }
    format = format || 'jpeg';
    if (!video || (format !== 'png' && format !== 'jpeg')) {
        return false;
    }
    var canvas = document.createElement("CANVAS");
    canvas.width = width || video.videoWidth;
    canvas.height = height || video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    var dataUri = canvas.toDataURL('image/' + format);
    var data = dataUri.split(',')[1];
    var mimeType = dataUri.split(';')[0].slice(5)

    var bytes = window.atob(data);
    var buf = new ArrayBuffer(bytes.length);
    var arr = new Uint8Array(buf);

    for (var i = 0; i < bytes.length; i++) {
        arr[i] = bytes.charCodeAt(i);
    }

    var blob = new Blob([ arr ], { type: mimeType });
    return { blob: blob, dataUri: dataUri, format: format, width: canvas.width, height: canvas.height };
};

/**
 *  Merge Images from https://github.com/lukechilds/merge-images
 */

// Defaults
const defaultOptions = {
	format: 'image/png',
	quality: 0.92,
	width: undefined,
	height: undefined,
	Canvas: undefined
};

// Return Promise
const mergeImages = (sources = [], options = {}) => new Promise(resolve => {
	options = Object.assign({}, defaultOptions, options);

	// Setup browser/Node.js specific variables
	const canvas = options.Canvas ? new options.Canvas() : window.document.createElement('canvas');
	const Image = options.Canvas ? options.Canvas.Image : window.Image;
	if (options.Canvas) {
		options.quality *= 100;
	}

	// Load sources
	const images = sources.map(source => new Promise((resolve, reject) => {
		// Convert sources to objects
		if (source.constructor.name !== 'Object') {
			source = { src: source };
		}

		// Resolve source and img when loaded
		const img = new Image();
		img.onerror = () => reject(new Error('Couldn\'t load image'));
		img.onload = () => resolve(Object.assign({}, source, { img }));
		img.src = source.src;
	}));

	// Get canvas context
	const ctx = canvas.getContext('2d');

	// When sources have loaded
	resolve(Promise.all(images)
		.then(images => {
			// Set canvas dimensions
			const getSize = dim => options[dim] || Math.max(...images.map(image => image.img[dim]));
			canvas.width = getSize('width');
			canvas.height = getSize('height');

			// Draw images to canvas
			images.forEach(image => {
				ctx.globalAlpha = image.opacity ? image.opacity : 1;
				return ctx.drawImage(image.img, image.x || 0, image.y || 0);
			});

			if (options.Canvas && options.format === 'image/jpeg') {
				// Resolve data URI for node-canvas jpeg async
				return new Promise(resolve => {
					canvas.toDataURL(options.format, {
						quality: options.quality,
						progressive: false
					}, (err, jpeg) => {
						if (err) {
							throw err;
						}
						resolve(jpeg);
					});
				});
			}

			// Resolve all other data URIs sync
			return canvas.toDataURL(options.format, options.quality);
		}));
    })
};
