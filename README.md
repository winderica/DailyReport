# DailyReport
Submit your health status to your fucking department everyday

## Usage

1. `yarn install`
2. edit `config.json`
3. `yarn build`
4. use crontab or something else to run it every day
    * Tips: `0 12 * * * sleep $(( RANDOM \% 21600 )); node /path/to/index.js` will run randomly from 12:00 to 18:00 everyday
        * `$RANDOM` should be supported in your shell, or you can get a 32 bits random number by running `od -vAn -N4 -tu4 < /dev/urandom`

## Bonus

Well, `HUST One` uses a ridiculous DES algorithm written by someone a trillion years ago to encrypt the username, password and nonce.  
This algorithm, which receives 3 keys but differs a lot from Triple-DES, is not surprisingly incorrect.  
The original script is extremely disgusting, so I reimplemented it in a not so disgusting way.  

```js
const { createCipheriv } = require('crypto');

const magicTable = [0, 1, 2, 6, 38, 37, 36, 7, 8, 9, 10, 14, 46, 45, 44, 15, 16, 17, 18, 22, 54, 53, 52, 23, 24, 25, 26, 30, 62, 61, 60, 31, 32, 33, 34, 35, 5, 4, 3, 39, 40, 41, 42, 43, 13, 12, 11, 47, 48, 49, 50, 51, 21, 20, 19, 55, 56, 57, 58, 59, 29, 28, 27, 63];

const toBuffer = (t) => Buffer.from(t.padEnd(Math.ceil(t.length / 4) * 4, '\0'), 'utf16le').swap16();
const toBits = (str) => [...toBuffer(str)].flatMap((i) => i.toString(2).padStart(8, '0').split('').map(Number));

const desEncrypt = (plain, key) => {
    const k = magicTable.map((i) => toBits(key)[i]).join('').match(/.{1,8}/g).map(i => parseInt(i, 2));
    const cipher = createCipheriv('DES-ECB', Buffer.from(k), null).setAutoPadding(false);
    return Buffer.concat([cipher.update(plain), cipher.final()]);
}
const desEEE = (plain, k1, k2, k3) => {
    return desEncrypt(desEncrypt(desEncrypt(toBuffer(plain), k1), k2), k3).toString('hex').toUpperCase();
}
```
