import { stringify } from 'querystring';

import { API_CAPTCHA, API_DO_ACTION, API_ENTRY_POINT, API_LOGIN, API_LOGIN_FINISHED, API_RENDER, API_START } from './constants';
import { desEEE } from './utils/des';
import { recognize } from './utils/recognize';
import { generateForm, get, postForm, postHeaders, referrer } from './utils/request';

import { password, username } from '../config.json';

const random = () => Math.random() * 999;
const time = () => ~~(Date.now() / 1000);

const login = async (username: string, password: string) => {
    await get(API_ENTRY_POINT);
    const queryString = stringify({ service: API_LOGIN_FINISHED });
    const { body } = await get(`${API_LOGIN}?${queryString}`);
    const lt = body.match(/LT-.*?-cas/g)![0];
    const code = await recognize((await get(API_CAPTCHA)).rawBody);
    const form = {
        ul: username.length,
        pl: password.length,
        lt,
        rsa: desEEE(username + password + lt, '1', '2', '3'),
        code,
        execution: 'e1s1', // e: count of GETs, s: MAYBE count of (invalid) POSTs
        _eventId: 'submit'
    };
    const redirect = (await postForm(`${API_LOGIN}?${queryString}`, form)).headers.location;
    if (!redirect) {
        throw new Error("Failed to login");
    }
    await get(redirect);
    return ((await get(API_ENTRY_POINT)).body).match(/(?<=itemscope="csrfToken" content=").*?(?=">)/g)![0];
};

const start = async (csrfToken: string) => {
    const form = generateForm({
        idc: "BKS",
        release: "",
        formData: JSON.stringify({
            _VAR_URL: API_ENTRY_POINT,
            _VAR_URL_Attr: {}
        })
    }, csrfToken);
    const res = await postForm(API_START, form, postHeaders(0));
    const { errno, entities } = JSON.parse(res.body);
    if (errno !== 0) {
        throw new Error(`Failed to post /start: ${res.body}`);
    }
    return +entities[0].match(/\d+/)[0];
};

const render = async (stepId: number, csrfToken: string) => {
    const form = generateForm({
        stepId,
        admin: false,
        instanceId: "",
        rand: random(),
        width: 1920,
    }, csrfToken);
    const res = await postForm(API_RENDER, form, postHeaders(stepId));
    const { errno, entities } = JSON.parse(res.body);
    if (errno !== 0) {
        throw new Error(`Failed to post /render: ${res.body}`);
    }
    const { actions, data, fields } = entities[0];
    return { data, fields, actionId: actions[0].id };
};

const doAction = async (stepId: number, actionId: number, formData: string, boundFields: string, csrfToken: string) => {
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
    const res = await postForm(API_DO_ACTION, form, postHeaders(stepId));
    const { errno, entities } = JSON.parse(res.body);
    if (errno !== 0) {
        throw new Error(`Failed to post /doAction: ${res.body}`);
    }
    return entities[0].flowStepId;
};

const diffField0 = (stepId: number, data: Record<string, string>) => JSON.stringify({
    ...data,
    "_VAR_ENTRY_NAME": "学生身体健康状况上报(_)",
    "_VAR_ENTRY_TAGS": "健康状况上报",
    "_VAR_URL": referrer(stepId),
    "fieldCS_Attr": JSON.stringify({ "_parent": "" }),
    "fieldCS_Name": "",
    "fieldCSNY": "",
    "fieldDQ_Attr": JSON.stringify({ "_parent": "" }),
    "fieldDQ_Name": "",
    "fieldGJ_Name": "",
    "fieldGLSJ": "",
    "fieldHidden1": "1",
    "fieldPCSJ": "",
    "fieldQRYSSJ": "",
    "fieldQZSJ": "",
    "fieldSbsj": "",
    "fieldSF_Name": "",
    "fieldSFLX": "",
    "fieldSqrDqwz_Name": "",
    "fieldSqrzzqt1": "",
    "fieldSqYx_Name": "",
    "fieldWFRGLSJ": "",
    "fieldZYSJ": "",
    "groupMQJCList": [],
    "groupYQRBList": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
});

const diffField1 = (stepId: number, data: Record<string, string>) => JSON.stringify({
    ...data,
    "_VAR_URL": referrer(stepId),
    "fieldCSNY": "",
    "fieldGLSJ": "",
    "fieldPCSJ": "",
    "fieldQRYSSJ": "",
    "fieldQZSJ": "",
    "fieldSFLX": "",
    "fieldWFRGLSJ": "",
    "fieldZYSJ": "",
    "groupMQJCList": []
});

const diffField2 = (stepId: number, data: Record<string, string>) => JSON.stringify({
    ...data,
    "_VAR_ENTRY_NAME": `学生身体健康状况上报(${data.fieldSqrXm}_${data.fieldSqYx_Name})`,
    "_VAR_URL": referrer(stepId),
    "fieldBZ": "无",
    "fieldGLSJ": "",
    "fieldJSTW": [
        (Math.random() * 0.9 + 36).toFixed(1),
        (Math.random() * 0.9 + 36).toFixed(1)
    ],
    "fieldPCSJ": "",
    "fieldQRYSSJ": "",
    "fieldQZSJ": "",
    "fieldWFRGLSJ": "",
    "fieldXBFZ_Name": "",
    "fieldXSZLB": (Math.random() * 0.9 + 36).toFixed(1),
    "fieldZYSJ": "",
    "groupMQJCList": [0, 1],
    "groupYQRBList": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
});

(async () => {
    const csrfToken = await login(username, password);
    let stepId = await start(csrfToken);
    const url = referrer(stepId);
    for (const differ of [diffField0, diffField1, diffField2]) {
        const { data, fields, actionId } = await render(stepId, csrfToken);
        if (data.fieldRBDTTBQK === '已') {
            return;
        }
        const boundFields = Object.entries<Record<string, string>>(fields).filter(([, v]) => v.bound).map(([k]) => k).toString();
        const formData = differ(stepId, data);
        stepId = await doAction(stepId, actionId, formData, boundFields, csrfToken);
    }
    console.log(url);
})();
