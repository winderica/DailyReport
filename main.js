const qs = require('querystring');
const fetchBase = require('node-fetch');
const sharp = require('sharp');
const { createWorker, PSM } = require('tesseract.js');
const sleep = require('util').promisify(setTimeout);
const config = require('./config.json');
// const config = {
//     username: 'U2010xxxxx',
//     password: 'P@ssw0rd',
// };
const { username, password } = config;

let COOKIE;
let CSRF_TOKEN;

const API_PASS = 'https://pass.hust.edu.cn/cas';
const API_YQTB = 'https://yqtb.hust.edu.cn/infoplus';

const API_ENTRY_POINT = `${API_YQTB}/form/BKS/start`;
const API_LOGIN = `${API_PASS}/login`;
const API_CAPTCHA = `${API_PASS}/code`;
const API_LOGIN_FINISHED = `${API_YQTB}/login?${qs.stringify({ retUrl: API_ENTRY_POINT })}`;
const API_START = `${API_YQTB}/interface/start`;
const API_RENDER = `${API_YQTB}/interface/render`;
const API_DO_ACTION = `${API_YQTB}/interface/doAction`;

const CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=utf-8';

const referrer = stepId => stepId ? `${API_YQTB}/form/${stepId}/render` : API_ENTRY_POINT;
const postHeaders = stepId => ({
    'Content-Type': CONTENT_TYPE,
    Referer: referrer(stepId),
    Cookie: COOKIE
});

// RSA is actually DES, their implementation of which is not surprisingly incorrect.
const des = (data, k1, k2, k3) => {
    const getBytes = str => str.split('').map(i => i.charCodeAt(0).toString(2).padStart(16, '0')).join('').padEnd(64, '0').split('').map(Number);
    const xor = (x, y) => x.map((i, j) => i ^ y[j]);
    const pPermute = sBoxByte => [15, 6, 19, 20, 28, 11, 27, 16, 0, 14, 22, 25, 4, 17, 30, 9, 1, 7, 23, 13, 31, 26, 2, 8, 18, 12, 29, 5, 21, 10, 3, 24].map(i => sBoxByte[i]);
    const expandPermute = rightData => [...new Array(8)].flatMap((i, j) => [rightData[31], ...rightData, rightData[0]].slice(j * 4, j * 4 + 6));
    const sBoxPermute = b => [...new Array(8)].flatMap((_, m) => [[[14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7], [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8], [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0], [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13]], [[15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10], [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5], [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15], [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9]], [[10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8], [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1], [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7], [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12]], [[7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15], [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9], [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4], [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14]], [[2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9], [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6], [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14], [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3]], [[12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11], [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8], [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6], [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13]], [[4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1], [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6], [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2], [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12]], [[13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7], [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2], [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8], [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11]]][m][b[m * 6] * 2 + b[m * 6 + 5]][b[m * 6 + 1] * 8 + b[m * 6 + 2] * 4 + b[m * 6 + 3] * 2 + b[m * 6 + 4]].toString(2).padStart(4, '0').split('').map(Number));
    const finallyPermute = endByte => [39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21, 61, 29, 36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49, 17, 57, 25, 32, 0, 40, 8, 48, 16, 56, 24].map(i => endByte[i]);
    return data.match(/.{1,4}/g).map(getBytes).map(t => {
        [k1, k2, k3].flatMap(i => i.match(/.{1,4}/g).map(getBytes)).forEach(k => {
            let key = [], l = [], r = [];
            for (let i = 0; i < 7; i++) for (let j = 0; j < 8; j++) key[i * 8 + j] = k[8 * (7 - j) + i];
            for (let i = 0; i < 4; i++) for (let j = 7; j >= 0; j--) [r[i * 8 + 7 - j], l[i * 8 + 7 - j]] = t.slice(j * 8 + i * 2, j * 8 + i * 2 + 2);
            [...new Array(16)].forEach((_, i) => {
                for (let j = 0; j < [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1][i]; j++) key = [...key.slice(1, 28), key[0], ...key.slice(29), key[28]];
                [l, r] = [r, xor(pPermute(sBoxPermute(xor(expandPermute(r), [13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29, 39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31].map(i => key[i])))), l)];
            });
            t = finallyPermute([...r, ...l]);
        });
        return BigInt('0b' + t.join('')).toString(16).padStart(16, '0');
    }).join('').toUpperCase();
};

const generateForm = (object) => ({
    csrfToken: CSRF_TOKEN,
    lang: 'en',
    ...object
});

const random = () => Math.random() * 999;
const time = () => ~~(Date.now() / 1000);

const fetch = async (url, data) => {
    await sleep(500);
    return fetchBase(url, data);
}

const get = async (url, headers, body) => await fetch(url, {
    headers,
    body,
    method: 'GET',
    redirect: 'manual'
});
const postBase = async (url, headers, body) => await fetch(url, {
    headers,
    body: qs.stringify(body),
    method: 'POST',
    redirect: 'manual'
});
const post = async (url, headers, body) => {
    const res = await postBase(url, headers, body);
    if (res.ok) {
        return res.json();
    } else {
        throw new Error("Fetch failed: " + await res.text());
    }
};
const getCookie = (res) => {
    return res.headers.raw()['set-cookie'].map(i => i.split(';')[0]).join('; ');
}

const recognize = async (buffer) => {
    await sharp(buffer, { page: 1 })
        .extract({ left: 0, top: 19, width: 85, height: 20 })
        .toColourspace('b-w')
        .threshold(254)
        .extend({
            top: 5,
            bottom: 5,
            left: 5,
            right: 5,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }).toFile('./temp.png');
    const worker = createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: PSM.SINGLE_LINE
    });
    const { data: { text } } = await worker.recognize('./temp.png', 'eng');
    await worker.terminate();
    return text.slice(0, 4);
}

const login = async (username, password) => {
    COOKIE = getCookie(await get(API_ENTRY_POINT));
    const queryString = qs.stringify({ service: API_LOGIN_FINISHED });
    const res = await get(`${API_LOGIN}?${queryString}`);
    const cookie = getCookie(res);
    const jsessionid = cookie.match(/(?<=JSESSIONID=).*?(?=;)/g)[0];
    const lt = (await res.text()).match(/LT-.*?-cas/g)[0];
    const code = await recognize(await (await get(API_CAPTCHA, { Cookie: cookie })).buffer());
    const form = {
        ul: username.length,
        pl: password.length,
        lt,
        rsa: des(username + password + lt, '1', '2', '3'),
        code,
        execution: 'e1s1', // e: count of GET, s: MAYBE count of (invalid) POST
        _eventId: 'submit'
    };
    const redirect = (await postBase(
        `${API_LOGIN};jsessionid=${jsessionid}?${queryString}`,
        { 'Content-Type': CONTENT_TYPE, Cookie: cookie },
        form
    )).headers.get('Location');
    if (!redirect) {
        throw new Error("Failed to login");
    }
    await get(redirect, { Cookie: COOKIE });
    await get(API_LOGIN_FINISHED, { Cookie: COOKIE });
    CSRF_TOKEN = (await (await get(API_ENTRY_POINT, { Cookie: COOKIE })).text()).match(/(?<=itemscope="csrfToken" content=").*?(?=">)/g)[0];
};

const start = async () => {
    const form = generateForm({
        idc: "BKS",
        release: "",
        formData: JSON.stringify({
            _VAR_URL: API_ENTRY_POINT,
            _VAR_URL_Attr: {}
        })
    });
    const res = await post(API_START, postHeaders(), form);
    const { errno, entities } = res;
    if (errno !== 0) {
        throw new Error(`Failed to post /start: ${JSON.stringify(res)}`);
    }
    return +entities[0].match(/\d+/)[0];
};

const render = async (stepId) => {
    const form = generateForm({
        stepId,
        admin: false,
        rand: random(),
        width: 1536,
    });
    const res = await post(API_RENDER, postHeaders(stepId), form);
    const { errno, entities } = res;
    if (errno !== 0) {
        throw new Error(`Failed to post /render: ${JSON.stringify(res)}`);
    }
    const { step: { stepId: actionId }, data, fields } = entities[0]; // Fuck, stepId in response is actually actionId
    return { data, fields, actionId };
};

const doAction = async (stepId, actionId, formData, boundFields) => {
    const form = generateForm({
        stepId,
        actionId,
        formData,
        remark: "",
        rand: random(),
        nextUsers: "{}",
        timestamp: time(),
        boundFields,
    });
    const res = await post(API_DO_ACTION, postHeaders(stepId), form);
    const { errno, entities } = res;
    if (errno !== 0) {
        throw new Error(`Failed to post /doAction: ${JSON.stringify(res)}`);
    }
    return entities[0].flowStepId;
};

const submit = async (stepId, differ) => {
    const { data, fields, actionId } = await render(stepId);
    const boundFields = Object.entries(fields).filter(([, v]) => v.bound).map(([k]) => k).toString();
    const formData = differ(stepId, data);
    return await doAction(stepId, actionId, formData, boundFields);
};

const diffField1 = (stepId, data) => JSON.stringify({
    ...data,
    "fieldSFZCTX": "2", // 是否再次填报 1首次填报 2再次填报
    "fieldSFYFSZZ": "2", // 身体健康状况是否发生变化 1是 2否
    "_VAR_ENTRY_NAME": "学生身体健康状况上报(_)",
    "_VAR_ENTRY_TAGS": "健康状况上报",
    "_VAR_URL": referrer(stepId),
    "_VAR_URL_Attr": "{}",
    "fieldCSNY": "", // 出生年月
    "fieldCS_Attr": JSON.stringify({ "_parent": "" }),
    "fieldCS_Name": "",
    "fieldDQ_Attr": JSON.stringify({ "_parent": "" }),
    "fieldDQ_Name": "",
    "fieldGJ_Name": "",
    "fieldGLSJ": "", // 发热且隔离时间
    "fieldPCSJ": "", // 疑似转排除时间
    "fieldQRYSSJ": "", // 确认疑似时间
    "fieldQZSJ": "", // 确诊时间
    "fieldSFLX": "", // 上报人身份
    "fieldSF_Name": "",
    "fieldSqYx_Name": "",
    "fieldSqrDqwz_Name": "",
    "fieldWFRGLSJ": "", // 未发热且隔离时间
    "fieldZYSJ": "", // 治愈时间
});

const diffField2 = (stepId, data) => JSON.stringify({
    ...data,
    "_VAR_ENTRY_NAME": `学生身体健康状况上报(_${data.fieldSqYx_Name})`,
    "_VAR_URL": referrer(stepId),
    "fieldBZ": "无",
    "fieldBrsffr": "20",
    "fieldBrsffr1": "2",
    "fieldBrsfks": "2",
    "fieldCS_Attr": JSON.stringify({ "_parent": data.fieldSF }),
    "fieldDQSZWZ": "2",
    "fieldDQ_Attr": JSON.stringify({ "_parent": data.fieldCS }),
    "fieldGLDD": "",
    "fieldGLSJ": "",
    "fieldJSSFKS": ["2", "2"],
    "fieldJSSFQC": ["2", "2"],
    "fieldJSTW": [
        (Math.random() * 0.5 + 36.5).toFixed(1),
        (Math.random() * 0.5 + 36.5).toFixed(1)
    ],
    "fieldJZQK": "",
    "fieldJZYY": "",
    "fieldMQJCRXM": ["父亲", "母亲"],
    "fieldMQJCRY": "",
    "fieldPCSJ": "",
    "fieldQRYSSJ": "",
    "fieldQZSJ": "",
    "fieldSFWQZYSBL": "2",
    "fieldSFYFSZZ": "2",
    "fieldSFZCTX": "2",
    "fieldSFZWGL": "",
    "fieldSqrzzqt": "1",
    "fieldWFRGLSJ": "",
    "fieldXBFZ_Name": "",
    "fieldXSZLB": (Math.random() * 0.5 + 36.5).toFixed(1),
    "groupMQJCList": [0, 1]
});

const fuck = async () => {
    await login(username, password);
    const firstStep = await start();
    const nextStep = await submit(firstStep, diffField1);
    await submit(nextStep, diffField2);
    console.log(referrer(firstStep));
};

fuck();
