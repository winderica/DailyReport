import { API_ENTRY_POINT, API_YQTB, CONTENT_TYPE } from '../constants';
import { promisify } from 'util';
import fetch, { HeadersInit, RequestInit, Response } from 'node-fetch';
import qs, { ParsedUrlQueryInput } from 'querystring';

const sleep = promisify(setTimeout);

export const referrer = (stepId: number) => stepId ? `${API_YQTB}/form/${stepId}/render` : API_ENTRY_POINT;

export const postHeaders = (stepId: number, cookie: string) => ({
    'Content-Type': CONTENT_TYPE,
    Referer: referrer(stepId),
    Cookie: cookie
});

export const generateForm = (object: {}, csrfToken: string) => ({
    csrfToken,
    lang: 'en',
    ...object
});

const sleepyFetch = async (url: string, data?: RequestInit) => {
    await sleep(500);
    return fetch(url, data);
}

export const get = async (url: string, headers?: HeadersInit) => await sleepyFetch(url, {
    headers,
    method: 'GET',
    redirect: 'manual'
});

export const postBase = async (url: string, headers?: HeadersInit, body?: object) => await sleepyFetch(url, {
    headers,
    body: qs.stringify(body as ParsedUrlQueryInput),
    method: 'POST',
    redirect: 'manual'
});

export const post = async (url: string, headers?: HeadersInit, body?: object) => {
    const res = await postBase(url, headers, body);
    if (res.ok) {
        return res.json();
    }
    throw new Error("Fetch failed: " + await res.text());
};

export const getCookie = (res: Response) => {
    return res.headers.raw()['set-cookie'].map(i => i.split(';')[0]).join('; ');
}
