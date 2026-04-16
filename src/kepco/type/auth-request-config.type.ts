import type { AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

export type KepcoAuthRequestConfig = Omit<AxiosRequestConfig, 'headers'> & {
  headers?: RawAxiosRequestHeaders; // 인증 쿠키와 합쳐질 추가 헤더
};
