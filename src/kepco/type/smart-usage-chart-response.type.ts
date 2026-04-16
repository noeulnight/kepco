import type { KepcoSmartUsageMenuType } from './smart-usage-menu-type.enum';

export type KepcoSmartUsageChartResponse = {
  period: KepcoSmartUsageMenuType; // 외부 API의 조회 주기
  items: Array<{
    label: string; // 차트 표시 라벨
    measuredAt: string; // 원본 시간/일/월/년 값
    measuredDate?: string; // 기준 일자
    usageKwh: number; // 현재 사용량
    charge: number; // 현재 요금
    previousDayUsageKwh: number; // 전일 사용량
    previousDayCharge: number; // 전일 요금
    lastYearUsageKwh: number; // 전년 동기간 사용량
    lastYearCharge: number; // 전년 동기간 요금
  }>;
};
