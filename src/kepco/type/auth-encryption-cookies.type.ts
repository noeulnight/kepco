export type KepcoAuthEncryptionCookies = {
  cookieSsId: string; // 로그인 암호문 앞에 붙는 세션 식별자
  cookieRsa: string; // 클라이언트 RSA 암호화에 사용하는 공개키 modulus
  cookieHeader: string; // 후속 요청에 전달할 Cookie 헤더 문자열
};
