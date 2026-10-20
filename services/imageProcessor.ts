
export interface QuantizationResult {
  pixels: number[]; // Array of palette indices
  palette: string[]; // Array of hex colors
  width: number;
  height: number;
}

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
};

const colorDistanceSq = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
    return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
};

export const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image: ${file.name}. Ensure it is a valid image file.`));
        };
        img.src = url;
    });
};

export const processImage = (
    img: HTMLImageElement, 
    maxColors: number = 12, 
    maxWidth: number = 1024
): QuantizationResult => {
    let w = img.width;
    let h = img.height;
    
    if (w > maxWidth) {
        const ratio = maxWidth / w;
        w = maxWidth;
        h = Math.floor(h * ratio);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Could not initialize 2D context.");
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, w, h);
    
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const pixelCount = w * h;

    // 1. Detect Unique Colors
    const uniqueColorsMap = new Map<string, number>();
    for (let i = 0; i < pixelCount; i++) {
        const offset = i * 4;
        if (data[offset + 3] < 128) continue; 
        const hex = rgbToHex(data[offset], data[offset+1], data[offset+2]);
        uniqueColorsMap.set(hex, (uniqueColorsMap.get(hex) || 0) + 1);
    }

    let palette: string[] = [];
    let pixels: number[] = new Array(pixelCount).fill(0);

    if (uniqueColorsMap.size <= maxColors) {
        // Sort existing small palette by frequency
        palette = Array.from(uniqueColorsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);
        for (let i = 0; i < pixelCount; i++) {
            const hex = rgbToHex(data[i*4], data[i*4+1], data[i*4+2]);
            pixels[i] = palette.indexOf(hex);
        }
    } else {
        // K-Means
        let centroids = Array.from(uniqueColorsMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(entry => hexToRgb(entry[0]));

        const assignments = new Uint8Array(pixelCount);
        for (let iter = 0; iter < 8; iter++) {
            const sums = centroids.map(() => [0, 0, 0, 0]); // r, g, b, count
            for (let i = 0; i < pixelCount; i++) {
                const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
                let minDist = Infinity, best = 0;
                for (let c = 0; c < centroids.length; c++) {
                    const d = colorDistanceSq(r, g, b, centroids[c][0], centroids[c][1], centroids[c][2]);
                    if (d < minDist) { minDist = d; best = c; }
                }
                assignments[i] = best;
                sums[best][0] += r; sums[best][1] += g; sums[best][2] += b; sums[best][3]++;
            }
            centroids = sums.map((s, idx) => s[3] > 0 ? [s[0]/s[3], s[1]/s[3], s[2]/s[3]] : centroids[idx]);
        }

        // Sort centroids by assigned pixel count (frequency)
        const counts = new Array(centroids.length).fill(0);
        assignments.forEach(a => counts[a]++);
        
        const indexedCentroids = centroids.map((c, i) => ({ color: c, count: counts[i], oldIdx: i }));
        indexedCentroids.sort((a, b) => b.count - a.count);
        
        palette = indexedCentroids.map(ic => rgbToHex(Math.round(ic.color[0]), Math.round(ic.color[1]), Math.round(ic.color[2])));
        const remapping = new Int32Array(centroids.length);
        indexedCentroids.forEach((ic, newIdx) => remapping[ic.oldIdx] = newIdx);
        
        pixels = Array.from(assignments).map(oldIdx => remapping[oldIdx]);
    }

    return { pixels, palette, width: w, height: h };
};
