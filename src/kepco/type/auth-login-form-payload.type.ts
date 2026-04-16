import type { KepcoAuthLoginPayload } from './auth-login-payload.type';
import type { KepcoYesNo } from './yes-no.enum';

export type KepcoAuthLoginFormPayload = KepcoAuthLoginPayload & {
  APT_YN: KepcoYesNo; // 아파트 고객 여부
  SSO_ID: string; // 사전 사용자 조회에서 받은 SSO 구분값
};
