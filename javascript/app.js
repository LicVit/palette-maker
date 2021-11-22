import * as $ from 'jquery';

import ImageUtil from './image-util.js';
import PaletteTableWriter from './palette-table-writer.js';
import HistogramPaletteBuilder from './histogram-palette-builder.js';
import HistogramPalettePlotter from './histogram-palette-plotter.js';
import MedianCutRunner from './median-cut-runner.js';
import MedianCutPlotter from './median-cut-plotter.js';
import KMeansRunner from './kmeans-runner.js';
import KMeansPlotter from './kmeans-plotter.js';
import HDBSCANRunner from './hdbscan-runner.js';
import HDBSCANPlotter from './hdbscan-plotter.js';

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
} else {
    alert('The File APIs are not fully supported in this browser.');
}

var image = null;
var timerId;
function handleFileSelect(evt) {
    $('#plot-content').hide();
    $('#histogram-output').hide();
    $('#median-cut-output').hide();
    $('#kmeans-output').hide();

    var file = evt.target.files[0];

    var start = 0;
    var stop = file.size - 1;

    var reader = new FileReader();

    reader.onload = ((theFile) => {
        return (e) => {
            image = document.getElementById('original-image');
            image.src = e.target.result;
        };
    })(file);

    $('#original-image').attr('src', '');
    timerId = setInterval(showImageIfPossible, 1000);
    reader.readAsDataURL(file);
}

function showImageIfPossible() {
    var imageSrc = document.getElementById('original-image').src;
    if (!_.isEmpty(imageSrc)) {
        clearInterval(timerId);

        run();

        plotOriginalData(pixels);
        $('#plot-content').show();
    } else {
        console.log('waiting for image to load...');
    }
}

var pixels = null;
var labPixels = null;
function run() {
    var imgWidth = image.width;
    var imgHeight = image.height;
    var maxDimension = imgWidth > imgHeight ? imgWidth : imgHeight;

    var scale = maxDimension / 100;
    var canvasHeight = parseInt(imgHeight / scale);
    var canvasWidth = parseInt(imgWidth / scale);

    var canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.getContext('2d').drawImage(image, 0, 0, canvasWidth, canvasHeight);

    /* console.log("Canvas size: " + canvas.width + "x" + canvas.height);*/
    var pixelData = canvas.getContext('2d').getImageData(0, 0, 1, 1).data;

    pixels = [];
    for (var x = 0; x < canvas.width; x++) {
        for (var y = 0; y < canvas.height; y++) {
            var pixel = canvas.getContext('2d').getImageData(x, y, 1, 1).data;
            pixels.push({
                red: pixel[0],
                green: pixel[1],
                blue: pixel[2]
            });
        }
    }

    labPixels = pixels;
    /* console.log("read image, found " + pixels.length + " pixels");*/
}

function runHistogram() {
    removePaletteTable('#histogram-palette');
    $('#histogram-output').hide();
    var histogramInputValue = parseInt($('#histogram-input').val());

    let histogramPaletteBuilder = new HistogramPaletteBuilder();
    let bucketedPixelInfos = histogramPaletteBuilder.binPixels(pixels, histogramInputValue);

    let histogramPalettePlotter = new HistogramPalettePlotter();
    histogramPalettePlotter.plot('histogram-plot', pixels, bucketedPixelInfos.buckets, bucketedPixelInfos.colors, histogramInputValue);

    var bucketsInPalette = _.take(bucketedPixelInfos.buckets, 27);
    PaletteTableWriter.drawPaletteTable('#histogram-palette', bucketsInPalette);

    $('#histogram-output').show();
}

function runMedianCut() {
    removePaletteTable('#median-cut-palette');
    $('#median-cut-output').hide();
    var medianCutInputValue = parseInt($('#median-cut-input').val());

    var groupsWithInfo = {
        points: pixels,
        xMin: 0,
        xMax: 255,
        yMin: 0,
        yMax: 255,
        zMin: 0,
        zMax: 255
    };

    let medianCutRunner = new MedianCutRunner();
    let result = medianCutRunner.run([groupsWithInfo], [], 0, medianCutInputValue);
    var groups = _.map(result.groups, (g) => {
        return g.points;
    });
    var cuts = result.cuts;

    let medianCutPlotter = new MedianCutPlotter();
    medianCutPlotter.plot('median-cut-plot', groups, cuts);

    PaletteTableWriter.drawPaletteTable('#median-cut-palette', groups);

    $('#median-cut-output').show();
}

function runKMeans() {
    removePaletteTable('#kmeans-palette');
    $('#kmeans-output').hide();
    var kMeansInputValue = parseInt($('#kmeans-input').val());

    let kmeansRunner = new KMeansRunner();
    let result = kmeansRunner.run(kMeansInputValue, pixels);

    let kmeansPlotter = new KMeansPlotter();
    kmeansPlotter.plot('kmeans-plot', result.clusters);
    PaletteTableWriter.drawPaletteTable('#kmeans-palette', result.clusters);

    $('#kmeans-output').show();
}

function runHDBSCAN() {
    removePaletteTable('#hdbscan-palette');
    $('#hdbscan-output').hide();
    let hdbscanInputValue = parseInt($('#hdbscan-input').val());
    let hdbscanInputValue2 = parseInt($('#hdbscan-input2').val());
    let cielab = document.getElementById('cielab-input').checked;
    let noise = document.getElementById('noise-input').checked;
    let extraSplitInputValue = parseInt($('#extra-split-input').val());
    let extraUnionInputValue = parseInt($('#extra-union-input').val());
    // TODO: implement splitting of big clusters, union by deltaE (and probably cut off by percentage)
    let hdbscanRunner = new HDBSCANRunner();

    let mappedPixels = pixels.map((pixel) => [pixel.red, pixel.green, pixel.blue]);
    let labPixels;
    if (cielab) {
        console.log('Using CIELAB space to detect clusters');
        labPixels = mappedPixels.map((rgb) => ImageUtil.rgbToLab(rgb));
    }
    let result = hdbscanRunner.run(hdbscanInputValue || 100, hdbscanInputValue2 || 5, mappedPixels, cielab ? labPixels : null);
    if (noise && result.noise && result.noise.length > 0) {
        let noisePixels = result.noise; //.map((pixelIndex) => pixels[pixelIndex]);
        let gridLength = 3;
        let histogramPaletteBuilder = new HistogramPaletteBuilder();
        let bucketedPixelInfos = histogramPaletteBuilder.binPixels(noisePixels, gridLength);

        let noiseClusters = [];
        let buckets = bucketedPixelInfos.buckets;
        Object.keys(buckets).forEach((key) => {
            noiseClusters.push(buckets[key].concat());
        });

        result.clusters.push(...noiseClusters);
    }

    let hdbscanPlotter = new HDBSCANPlotter();
    hdbscanPlotter.plot('hdbscan-plot', result.clusters);
    PaletteTableWriter.drawPaletteTable('#hdbscan-palette', result.clusters);

    $('#hdbscan-output').show();
}

function removePaletteTable(containerId) {
    $(containerId).empty();
}

function plotOriginalData(pixels) {
    var colors = _.map(pixels, (p, index) => {
        return 'rgb(' + p.red + ',' + p.green + ',' + p.blue + ')';
    });

    var data = {
        x: _.map(pixels, (p) => {
            return p.red;
        }),
        y: _.map(pixels, (p) => {
            return p.green;
        }),
        z: _.map(pixels, (p) => {
            return p.blue;
        }),
        mode: 'markers',
        marker: {
            size: 3,
            color: colors,
            line: {
                color: 'rgb(100,100,100)',
                width: 1
            }
        },
        type: 'scatter3d'
    };

    var layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        scene: {
            xaxis: { title: 'Red' },
            yaxis: { title: 'Green' },
            zaxis: { title: 'Blue' }
        }
    };

    Plotly.newPlot('input-image-plot', [data], layout);
    $('#input-image-plot').show();
    $('.input-image-panel').show();
}

$('.plot-toggle-header').click(() => {
    $header = $(this);
    //getting the next element
    $content = $header.next();
    //open up the content needed - toggle the slide- if visible, slide up, if not slidedown.
    $content.slideToggle(300, () => {});
});

$(document).ready(() => {
    document.getElementById('file').addEventListener('change', handleFileSelect, false);

    $('#run-histogram').click(runHistogram);
    $('#run-median-cut').click(runMedianCut);
    $('#run-kmeans').click(runKMeans);
    $('#run-hdbscan').click(runHDBSCAN);
});
