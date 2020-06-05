import got, { Headers } from 'got';
import { CookieJar } from 'tough-cookie';

import { API_ENTRY_POINT, API_YQTB, USER_AGENT } from '../constants';

export const cookieJar = new CookieJar();

export const referrer = (stepId: number) => stepId ? `${API_YQTB}/form/${stepId}/render` : API_ENTRY_POINT;

export const postHeaders = (stepId: number) => ({
    Referer: referrer(stepId),
});

export const generateForm = (object: {}, csrfToken: string) => ({
    csrfToken,
    lang: 'en',
    ...object
});

export const get = async (url: string) => await got(url, {
    headers: {
        'user-agent': USER_AGENT
    },
    cookieJar,
});

export const postForm = async (url: string, form?: object, headers?: Headers) => await got.post(url, {
    headers: {
        'user-agent': USER_AGENT,
        ...headers
    },
    form,
    followRedirect: false,
    cookieJar,
});

export const postJSON = async <T>(url: string, json?: object, headers?: Headers) => await got.post<T>(url, {
    headers: {
        'user-agent': USER_AGENT,
        ...headers
    },
    json,
    followRedirect: false,
    responseType: 'json',
    cookieJar,
});
