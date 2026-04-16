import type { KepcoSmartUsageMenuType } from './smart-usage-menu-type.enum';

export type KepcoSmartUsageChartRequest = {
  period: KepcoSmartUsageMenuType; // 외부 API의 조회 주기
};
