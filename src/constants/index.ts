import qs from 'querystring';

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

export { API_PASS, API_YQTB, API_ENTRY_POINT, API_LOGIN, API_CAPTCHA, API_LOGIN_FINISHED, API_START, API_RENDER, API_DO_ACTION, CONTENT_TYPE };
