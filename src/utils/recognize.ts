import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';

const transpose = (data: Buffer, width: number) => {
    return [...new Array(width).keys()].map((i) => [...data].filter((_, j) => j % width === i))
}

const match = (pixels: number[][], digits: number[][]) => {
    const scores = [...new Array(10)].map(() => 0);
    for (let i = 0; i < 180; i++) {
        for (let j = 0; j < 20; j++) {
            if (pixels[i % 18][j] === digits[i][j]) {
                scores[~~(i / 18)]++;
            }
        }
    }
    return scores.indexOf(Math.max(...scores));
}

export const recognize = async (buffer: Buffer) => {
    const data = await sharp(buffer, { page: 1 })
        .extract({ left: 0, top: 19, width: 87, height: 20 })
        .toColourspace('b-w')
        .threshold(254)
        .raw().toBuffer();
    const digitsImage = readFileSync(resolve(dirname(require.main!.filename), '../assets', 'digits.png'));
    const digits = transpose(await sharp(digitsImage).toColourspace('b-w').raw().toBuffer(), 180);
    const pixels = [[...new Array(20)].map(() => 255), ...transpose(data, 87)];
    return [...new Array(4).keys()].map((i) => match(pixels.slice(i * 22, i * 22 + 18), digits)).join('');
}
