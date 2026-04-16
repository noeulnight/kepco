export type KepcoSmartUsageFeeRawResponse = {
  FUND_BILL: string; // 전력산업기반기금
  BASE_BILL: string; // 기본요금
  F_AP_QT: string; // 실시간 사용량(kWh)
  TOT_BILL: string; // 소계 요금
  REAL_KWH_BILL: string; // 실시간 기준 전력량요금
  TOTAL_CHARGE: string; // 실시간 총요금
  DT: number; // 현재까지 경과일
  PREDICT_FUND_BILL: string; // 예상 전력산업기반기금
  KWH_BILL: string; // 전력량요금
  HSHCNT: number; // 세대수
  PREDICT_VAT_BILL: string; // 예상 부가가치세
  PREDICT_BILL_LEVEL: string; // 예상 사용량 구간
  TOU_JOJ_KW_TIME: string; // 계시별 선택요금 적용전력 기준 시점
  END_DT: string; // 청구 종료일
  PREDICT_BASE_BILL: string; // 예상 기본요금
  TOU_BASE_BILL_UCOST: string; // 계시별 선택요금 기본요금 단가
  BASE_BILL_UCOST: string; // 기본요금 단가
  SELECT_DT: string; // 조회일
  VAT_BILL: string; // 부가가치세
  TOU_JOJ_KW: number; // 계시별 선택요금 적용전력
  START_DT: string; // 청구 시작일
  UNIT_PRICE: string; // 화면 기준 단가 구분값
  CNTR_KND_NM: string; // 적용 전기요금명
  USEKWH_UCOST4: number; // 계절/시간대 전력량요금 단가 1
  JOJ_KW: number; // 적용전력
  USEKWH_UCOST5: number; // 계절/시간대 전력량요금 단가 2
  PREDICT_TOTAL_CHARGE: string; // 예상 총요금
  USEKWH_UCOST6: number; // 계절/시간대 전력량요금 단가 3
  REAL_PREDICT_TOT_BILL: string; // 실시간 기준 예상 소계 요금
  KWH_TYPE: string; // 현재 사용량 구간
  ELEC_CAR_CD: string; // 특례/전기요금 코드
  USEKWH_UCOST1: number; // 누진 1단계 단가
  PREDICT_BILL: string; // 예상 청구요금
  USEKWH_UCOST2: number; // 누진 2단계 단가
  USEKWH_UCOST3: number; // 누진 3단계 단가
  PREDICT_TOT_BILL: string; // 예상 소계 요금
  TOU_BASE_BILL: string; // 계시별 선택요금 기본요금
  ET: number; // 청구 주기 총일수
  PREDICT_TOT: string; // 예상 사용량(kWh)
  ELEC_CAR_NM: string; // 특례유형명
  JOJ_KW_TIME: string; // 적용전력 기준 시점
};
