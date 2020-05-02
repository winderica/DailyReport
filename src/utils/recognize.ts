import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

const transpose = (data: Buffer, width: number) => {
    return [...new Array(width).keys()].map((i) => [...data].filter((_, j) => j % width === i))
}

const match = async (pixels: number[][], digits: number[][]) => {
    const score = [...new Array(10)].map(() => 0);
    for (let i = 0; i < 180; i++) {
        for (let j = 0; j < 20; j++) {
            if (pixels[i % 18][j] === digits[i][j]) {
                score[~~(i / 18)]++;
            }
        }
    }
    return score.indexOf(Math.max(...score));
}

const recognize = async (buffer: Buffer) => {
    const data = await sharp(buffer, { page: 1 })
        .extract({ left: 0, top: 19, width: 87, height: 20 })
        .toColourspace('b-w')
        .threshold(254)
        .raw().toBuffer();
    const digitsImage = await readFile(path.resolve(path.dirname(require.main!.filename), '../assets', 'digits.png'));
    const digits = transpose(await sharp(digitsImage).toColourspace('b-w').raw().toBuffer(), 180);
    const pixels = [[...new Array(20)].map(() => 255), ...transpose(data, 87)];
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += await match(pixels.slice(i * 22, i * 22 + 18), digits);
    }
    return code;
}

export { recognize };
