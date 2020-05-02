import qs from 'querystring';

export const API_PASS = 'https://pass.hust.edu.cn/cas';
export const API_YQTB = 'https://yqtb.hust.edu.cn/infoplus';

export const API_ENTRY_POINT = `${API_YQTB}/form/BKS/start`;
export const API_LOGIN = `${API_PASS}/login`;
export const API_CAPTCHA = `${API_PASS}/code`;
export const API_LOGIN_FINISHED = `${API_YQTB}/login?${qs.stringify({ retUrl: API_ENTRY_POINT })}`;
export const API_START = `${API_YQTB}/interface/start`;
export const API_RENDER = `${API_YQTB}/interface/render`;
export const API_DO_ACTION = `${API_YQTB}/interface/doAction`;

export const CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=utf-8';
