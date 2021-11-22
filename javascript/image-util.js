export default class ImageUtil {
    static rgbToHsl(r, g, b) {
        (r /= 255), (g /= 255), (b /= 255);
        var max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        var h,
            s,
            l = (max + min) / 2;

        if (max == min) {
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return [h, s, l];
    }

    // the following functions are based off of the pseudocode
    // found on www.easyrgb.com
    static labToRgb(lab) {
        let y = (lab[0] + 16) / 116,
            x = lab[1] / 500 + y,
            z = y - lab[2] / 200,
            r,
            g,
            b;

        x = 0.95047 * (x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787);
        y = 1.0 * (y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787);
        z = 1.08883 * (z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787);

        r = x * 3.2406 + y * -1.5372 + z * -0.4986;
        g = x * -0.9689 + y * 1.8758 + z * 0.0415;
        b = x * 0.0557 + y * -0.204 + z * 1.057;

        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
        b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

        (r *= 255), (g *= 255), (b *= 255);

        return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
    }

    static rgbToLab(rgb) {
        let r = rgb[0],
            g = rgb[1],
            b = rgb[2],
            x,
            y,
            z;

        (r /= 255), (g /= 255), (b /= 255);

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
        z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

        x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
        y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
        z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

        return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
    }

    static getDeltaE76(lab0, lab1) {
        return Math.sqrt(Math.pow(lab0[0] - lab1[0], 2) + Math.pow(lab0[1] - lab1[1], 2) + Math.pow(lab0[2] - lab1[2], 2));
    }

    static getPixelLuminance(pixel) {
        return pixel.red * 0.2126 + pixel.green * 0.7152 + pixel.blue * 0.0722;
    }

    static pixelToString(pixel) {
        return 'r: ' + pixel.red + ', g: ' + pixel.green + ', b: ' + pixel.blue;
    }

    static numberToPaddedHexString(number) {
        var hexString = parseInt(number).toString(16);
        if (hexString.length == 1) {
            return '0' + hexString;
        }
        return hexString;
    }

    static pixelToHexString(pixel) {
        var hexString =
            '#' +
            ImageUtil.numberToPaddedHexString(pixel.red) +
            ImageUtil.numberToPaddedHexString(pixel.green) +
            ImageUtil.numberToPaddedHexString(pixel.blue);
        return hexString;
    }

    static getColorPreviewHtmlString(color) {
        var color = ImageUtil.pixelToHexString(color);
        return '<div class="colorPreview" style="background:' + color + '"></div>';
    }

    static computeAverageColor(pixels) {
        var totalRed = _.chain(pixels)
            .map(function (p) {
                return p.red;
            })
            .sum()
            .value();
        var totalGreen = _.chain(pixels)
            .map(function (p) {
                return p.green;
            })
            .sum()
            .value();
        var totalBlue = _.chain(pixels)
            .map(function (p) {
                return p.blue;
            })
            .sum()
            .value();
        return {
            red: totalRed / pixels.length,
            green: totalGreen / pixels.length,
            blue: totalBlue / pixels.length
        };
    }
}
