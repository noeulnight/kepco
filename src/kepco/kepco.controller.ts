import { Controller, Get, Query } from '@nestjs/common';
import { KepcoService } from './kepco.service';
import { KepcoSmartUsageMenuType } from './type/smart-usage-menu-type.enum';
import type { KepcoSmartUsageChartResponse } from './type/smart-usage-chart-response.type';
import type { KepcoSmartUsageFeeResponse } from './type/smart-usage-fee-response.type';

@Controller('kepco')
export class KepcoController {
  constructor(private readonly kepcoService: KepcoService) {}

  @Get('usage')
  getSmartUsageFee(): Promise<KepcoSmartUsageFeeResponse> {
    return this.kepcoService.getSmartUsageFee({
      period: KepcoSmartUsageMenuType.Time,
      TOU: false,
    });
  }

  @Get('usage/chart')
  getSmartUsageChart(
    @Query('period') period?: KepcoSmartUsageMenuType,
  ): Promise<KepcoSmartUsageChartResponse> {
    return this.kepcoService.getSmartUsageChart({
      period: period ?? KepcoSmartUsageMenuType.Time,
    });
  }
}
