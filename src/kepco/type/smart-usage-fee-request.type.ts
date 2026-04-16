import type { KepcoSmartUsageMenuType } from './smart-usage-menu-type.enum';

export type KepcoSmartUsageFeeRequest = {
  period: KepcoSmartUsageMenuType.Time; // 외부 API의 조회 주기
  TOU: boolean; // 계시별 선택요금 여부
};
