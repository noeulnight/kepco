export type KepcoSmartUsageChartRawItem = {
  LDAY_F_AP_QT: number; // 전일 사용량
  MR_HHMI: string; // 시간/일/월/년 라벨 원문
  F_AP_QT: number; // 현재 사용량
  MR_YMD?: string; // 기준 일자
  LDAY_KWH_BILL: number; // 전일 요금
  LYEAR_F_AP_QT: number; // 전년 동기간 사용량
  LYEAR_KWH_BILL: number; // 전년 동기간 요금
  KWH_BILL: number; // 현재 요금
};
