import ImageUtil from './image-util.js';
import { Hdbscan, euclidean } from 'hdbscan';
export default class HDBSCANRunner {
    constructor() {}

    run(minClusterSize, minSamples, pixels, cielabPixels) {
        function pixelIndexToRGB(pixelIndex) {
            const p = pixels[pixelIndex];
            return { red: p[0], green: p[1], blue: p[2] };
        }

        var result = new Hdbscan({ input: cielabPixels || pixels, minClusterSize, minSamples, alpha: 1, metric: euclidean, debug: false });

        console.log('run hdbscan', result);
        // indices of clusters
        var clusters = result.getClusters();

        console.log('pixels');
        console.log(pixels);

        clusters.forEach((elem, index) => {
            clusters[index] = elem.map(pixelIndexToRGB);
        });

        var noise = result.getNoise();
        noise = noise.map(pixelIndexToRGB);
        var means = this.computeMeans(clusters);
        console.log('cluster noise means:');
        console.log(clusters, noise, means);
        return {
            clusters,
            noise,
            means
        };
    }

    computeMeans(groups) {
        return _.map(groups, (group) => {
            let averageColor = ImageUtil.computeAverageColor(group);
            return {
                red: averageColor.red,
                green: averageColor.green,
                blue: averageColor.blue
            };
        });
    }
}
