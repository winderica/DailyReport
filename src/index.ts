import qs from 'querystring';

import {
    API_CAPTCHA,
    API_DO_ACTION,
    API_ENTRY_POINT,
    API_HEALTH,
    API_LOGIN,
    API_LOGIN_FINISHED,
    API_RECORDED,
    API_RENDER,
    API_START,
    Config
} from './constants';
import { desEEE } from './utils/des';
import { recognize } from './utils/recognize';
import { generateForm, get, postForm, postHeaders, postJSON, referrer } from './utils/request';

import config from '../config.json';

const { username, password } = config as Config;

const random = () => Math.random() * 999;
const time = () => ~~(Date.now() / 1000);

const login = async (username: string, password: string) => {
    await get(API_ENTRY_POINT);
    const queryString = qs.stringify({ service: API_LOGIN_FINISHED });
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
        throw new Error(`Failed to post /start: ${JSON.stringify(res)}`);
    }
    return +entities[0].match(/\d+/)[0];
};

const render = async (stepId: number, csrfToken: string) => {
    const form = generateForm({
        stepId,
        admin: false,
        rand: random(),
        width: 1536,
    }, csrfToken);
    const res = await postForm(API_RENDER, form, postHeaders(stepId));
    const { errno, entities } = JSON.parse(res.body);
    if (errno !== 0) {
        throw new Error(`Failed to post /render: ${JSON.stringify(res)}`);
    }
    const { step: { stepId: actionId }, data, fields } = entities[0]; // Fuck, stepId in response is actually actionId
    return { data, fields, actionId };
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
        throw new Error(`Failed to post /doAction: ${JSON.stringify(res)}`);
    }
    return entities[0].flowStepId;
};

const submit = async (stepId: number, differ: (stepId: number, data: { [key: string]: string }) => string, csrfToken: string) => {
    const { data, fields, actionId } = await render(stepId, csrfToken);
    const boundFields = Object.entries(fields).filter(([, v]) => (v as { [key: string]: string }).bound).map(([k]) => k).toString();
    const formData = differ(stepId, data);
    return await doAction(stepId, actionId, formData, boundFields, csrfToken);
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
    const csrfToken = await login(username, password);
    await get(API_HEALTH);
    const { body } = await postJSON<{ RECORD_TIMES: number }>(API_RECORDED, {});
    if (!body.RECORD_TIMES) {
        const firstStep = await start(csrfToken);
        const nextStep = await submit(firstStep, diffField1, csrfToken);
        await submit(nextStep, diffField2, csrfToken);
        console.log(referrer(firstStep));
    }
};

fuck().then();
