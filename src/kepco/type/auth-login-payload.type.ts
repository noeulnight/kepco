import type { KepcoAuthUserType } from './auth-user-type.enum';

export type KepcoAuthLoginPayload = {
  USER_ID: string; // cookieSsId + RSA 암호화 아이디
  USER_PWD: string; // cookieSsId + RSA 암호화 비밀번호
  USER_CI: string; // 본인인증 연계정보, 일반 로그인에서는 빈 값
  TYPE: KepcoAuthUserType; // 로그인 사용자 유형
};
