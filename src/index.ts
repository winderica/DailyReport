import { API_CAPTCHA, API_DO_ACTION, API_ENTRY_POINT, API_LOGIN, API_LOGIN_FINISHED, API_RENDER, API_START, CONTENT_TYPE } from './constants';
import { generateForm, get, getCookie, post, postBase, postHeaders, referrer } from './utils/request';
import qs from 'querystring';

import { recognize } from './utils/recognize';

import { des } from './utils/des';

import config from '../config.json';
// const config = {
//     username: 'U2010xxxxx',
//     password: 'P@ssw0rd',
// };
const { username, password } = config as { username: string; password: string; };

let formCookie: string;
let csrfToken: string;

const random = () => Math.random() * 999;
const time = () => ~~(Date.now() / 1000);

const login = async (username: string, password: string) => {
    formCookie = getCookie(await get(API_ENTRY_POINT));
    const queryString = qs.stringify({ service: API_LOGIN_FINISHED });
    const res = await get(`${API_LOGIN}?${queryString}`);
    const loginCookie = getCookie(res);
    const jsessionid = loginCookie.match(/(?<=JSESSIONID=).*?(?=;)/g)![0];
    const lt = (await res.text()).match(/LT-.*?-cas/g)![0];
    const code = await recognize(await (await get(API_CAPTCHA, { Cookie: loginCookie })).buffer());
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
        { 'Content-Type': CONTENT_TYPE, Cookie: loginCookie },
        form
    )).headers.get('Location');
    if (!redirect) {
        throw new Error("Failed to login");
    }
    await get(redirect, { Cookie: formCookie });
    await get(API_LOGIN_FINISHED, { Cookie: formCookie });
    csrfToken = (await (await get(API_ENTRY_POINT, { Cookie: formCookie })).text()).match(/(?<=itemscope="csrfToken" content=").*?(?=">)/g)![0];
};

const start = async () => {
    const form = generateForm({
        idc: "BKS",
        release: "",
        formData: JSON.stringify({
            _VAR_URL: API_ENTRY_POINT,
            _VAR_URL_Attr: {}
        })
    }, csrfToken);
    const res = await post(API_START, postHeaders(0, formCookie), form);
    const { errno, entities } = res;
    if (errno !== 0) {
        throw new Error(`Failed to post /start: ${JSON.stringify(res)}`);
    }
    return +entities[0].match(/\d+/)[0];
};

const render = async (stepId: number) => {
    const form = generateForm({
        stepId,
        admin: false,
        rand: random(),
        width: 1536,
    }, csrfToken);
    const res = await post(API_RENDER, postHeaders(stepId, formCookie), form);
    const { errno, entities } = res;
    if (errno !== 0) {
        throw new Error(`Failed to post /render: ${JSON.stringify(res)}`);
    }
    const { step: { stepId: actionId }, data, fields } = entities[0]; // Fuck, stepId in response is actually actionId
    return { data, fields, actionId };
};

const doAction = async (stepId: number, actionId: number, formData: string, boundFields: string) => {
    const form = generateForm({
        stepId,
        actionId,
        formData,
        remark: "",
        rand: random(),
        nextUsers: "{}",
        timestamp: time(),
        boundFields,
    }, csrfToken);
    const res = await post(API_DO_ACTION, postHeaders(stepId, formCookie), form);
    const { errno, entities } = res;
    if (errno !== 0) {
        throw new Error(`Failed to post /doAction: ${JSON.stringify(res)}`);
    }
    return entities[0].flowStepId;
};

const submit = async (stepId: number, differ: (stepId: number, data: { [key: string]: string }) => string) => {
    const { data, fields, actionId } = await render(stepId);
    const boundFields = Object.entries(fields).filter(([, v]) => (v as { [key: string]: string }).bound).map(([k]) => k).toString();
    const formData = differ(stepId, data);
    return await doAction(stepId, actionId, formData, boundFields);
};

const diffField1 = (stepId: number, data: { [key: string]: string }) => JSON.stringify({
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

const diffField2 = (stepId: number, data: { [key: string]: string }) => JSON.stringify({
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

fuck().then();
