import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import { KepcoService } from '../kepco/kepco.service';
import type { KepcoSmartUsageChartResponse } from '../kepco/type/smart-usage-chart-response.type';
import { KepcoSmartUsageMenuType } from '../kepco/type/smart-usage-menu-type.enum';
import type { KepcoSmartUsageFeeResponse } from '../kepco/type/smart-usage-fee-response.type';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private static readonly REFRESH_INTERVAL_MS = 60_000;
  private static readonly CHART_PERIODS = [
    KepcoSmartUsageMenuType.Time,
    KepcoSmartUsageMenuType.Day,
    KepcoSmartUsageMenuType.Month,
    KepcoSmartUsageMenuType.Year,
  ] as const;
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry = new Registry();
  private readonly gauges = {
    usageRealtimeKwh: new Gauge({
      name: 'kepco_usage_realtime_kwh',
      help: 'Current KEPCO realtime usage in kWh',
      registers: [this.registry],
    }),
    usagePredictedKwh: new Gauge({
      name: 'kepco_usage_predicted_kwh',
      help: 'Current KEPCO predicted usage in kWh',
      registers: [this.registry],
    }),
    usageCurrentTier: new Gauge({
      name: 'kepco_usage_current_tier',
      help: 'Current KEPCO usage billing tier',
      registers: [this.registry],
    }),
    usagePredictedTier: new Gauge({
      name: 'kepco_usage_predicted_tier',
      help: 'Current KEPCO predicted billing tier',
      registers: [this.registry],
    }),
    billingDemandKw: new Gauge({
      name: 'kepco_billing_demand_kw',
      help: 'Current KEPCO billing demand in kW',
      registers: [this.registry],
    }),
    billingBaseChargeAmount: new Gauge({
      name: 'kepco_billing_base_charge_amount',
      help: 'Current KEPCO base charge amount',
      registers: [this.registry],
    }),
    billingEnergyCharge: new Gauge({
      name: 'kepco_billing_energy_charge',
      help: 'Current KEPCO energy charge amount',
      registers: [this.registry],
    }),
    billingRealtimeEnergyCharge: new Gauge({
      name: 'kepco_billing_realtime_energy_charge',
      help: 'Current KEPCO realtime energy charge amount',
      registers: [this.registry],
    }),
    billingSubtotalCharge: new Gauge({
      name: 'kepco_billing_subtotal_charge',
      help: 'Current KEPCO billing subtotal charge amount',
      registers: [this.registry],
    }),
    billingVatCharge: new Gauge({
      name: 'kepco_billing_vat_charge',
      help: 'Current KEPCO billing VAT charge amount',
      registers: [this.registry],
    }),
    billingFundCharge: new Gauge({
      name: 'kepco_billing_fund_charge',
      help: 'Current KEPCO billing fund charge amount',
      registers: [this.registry],
    }),
    billingRealtimeTotalCharge: new Gauge({
      name: 'kepco_billing_realtime_total_charge',
      help: 'Current KEPCO realtime total charge amount',
      registers: [this.registry],
    }),
    predictedCharge: new Gauge({
      name: 'kepco_predicted_charge',
      help: 'Current KEPCO predicted charge amount',
      registers: [this.registry],
    }),
    predictedSubtotalCharge: new Gauge({
      name: 'kepco_predicted_subtotal_charge',
      help: 'Current KEPCO predicted subtotal charge amount',
      registers: [this.registry],
    }),
    predictedRealtimeSubtotalCharge: new Gauge({
      name: 'kepco_predicted_realtime_subtotal_charge',
      help: 'Current KEPCO predicted realtime subtotal charge amount',
      registers: [this.registry],
    }),
    predictedBaseCharge: new Gauge({
      name: 'kepco_predicted_base_charge',
      help: 'Current KEPCO predicted base charge amount',
      registers: [this.registry],
    }),
    predictedVatCharge: new Gauge({
      name: 'kepco_predicted_vat_charge',
      help: 'Current KEPCO predicted VAT charge amount',
      registers: [this.registry],
    }),
    predictedFundCharge: new Gauge({
      name: 'kepco_predicted_fund_charge',
      help: 'Current KEPCO predicted fund charge amount',
      registers: [this.registry],
    }),
    predictedTotalCharge: new Gauge({
      name: 'kepco_predicted_total_charge',
      help: 'Current KEPCO predicted total charge amount',
      registers: [this.registry],
    }),
    chartUsageKwh: new Gauge({
      name: 'kepco_chart_usage_kwh',
      help: 'KEPCO chart usage in kWh by period and comparison series',
      labelNames: ['period', 'series', 'measured_at', 'measured_date'],
      registers: [this.registry],
    }),
    chartUsageTotalKwh: new Gauge({
      name: 'kepco_chart_usage_total_kwh',
      help: 'Summed KEPCO chart usage in kWh by period and comparison series',
      labelNames: ['period', 'series'],
      registers: [this.registry],
    }),
    chartCharge: new Gauge({
      name: 'kepco_chart_charge',
      help: 'KEPCO chart charge by period and comparison series',
      labelNames: ['period', 'series', 'measured_at', 'measured_date'],
      registers: [this.registry],
    }),
  };
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(private readonly kepcoService: KepcoService) {
    collectDefaultMetrics({
      register: this.registry,
    });
  }

  onModuleInit(): void {
    this.refreshTimer = setInterval(() => {
      void this.refreshMetrics();
    }, MetricsService.REFRESH_INTERVAL_MS);

    void this.refreshMetrics();
  }

  onModuleDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async refreshMetrics(): Promise<void> {
    await Promise.all([
      this.refreshOverviewMetrics(),
      this.refreshChartMetrics(),
    ]);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  private async refreshOverviewMetrics(): Promise<void> {
    try {
      const usage = await this.kepcoService.getSmartUsageFee({
        period: KepcoSmartUsageMenuType.Time,
        TOU: false,
      });

      this.updateGauges(usage);
    } catch (error) {
      this.logger.error('Failed to refresh KEPCO overview metrics', error);
    }
  }

  private async refreshChartMetrics(): Promise<void> {
    try {
      const charts = await Promise.all(
        MetricsService.CHART_PERIODS.map((period) =>
          this.kepcoService.getSmartUsageChart({ period }),
        ),
      );

      this.updateChartGauges(charts);
    } catch (error) {
      this.logger.error('Failed to refresh KEPCO chart metrics', error);
    }
  }

  private updateGauges(usage: KepcoSmartUsageFeeResponse): void {
    this.gauges.usageRealtimeKwh.set(usage.usage.realtimeKwh);
    this.gauges.usagePredictedKwh.set(usage.usage.predictedKwh);
    this.gauges.usageCurrentTier.set(usage.usage.currentTier);
    this.gauges.usagePredictedTier.set(usage.usage.predictedTier);

    this.gauges.billingDemandKw.set(usage.billing.demand.kw);
    this.gauges.billingBaseChargeAmount.set(usage.billing.baseCharge.amount);
    this.gauges.billingEnergyCharge.set(usage.billing.energyCharge);
    this.gauges.billingRealtimeEnergyCharge.set(
      usage.billing.realtimeEnergyCharge,
    );
    this.gauges.billingSubtotalCharge.set(usage.billing.subtotalCharge);
    this.gauges.billingVatCharge.set(usage.billing.vatCharge);
    this.gauges.billingFundCharge.set(usage.billing.fundCharge);
    this.gauges.billingRealtimeTotalCharge.set(
      usage.billing.realtimeTotalCharge,
    );

    this.gauges.predictedCharge.set(usage.predicted.charge);
    this.gauges.predictedSubtotalCharge.set(usage.predicted.subtotalCharge);
    this.gauges.predictedRealtimeSubtotalCharge.set(
      usage.predicted.realtimeSubtotalCharge,
    );
    this.gauges.predictedBaseCharge.set(usage.predicted.baseCharge);
    this.gauges.predictedVatCharge.set(usage.predicted.vatCharge);
    this.gauges.predictedFundCharge.set(usage.predicted.fundCharge);
    this.gauges.predictedTotalCharge.set(usage.predicted.totalCharge);
  }

  private updateChartGauges(charts: KepcoSmartUsageChartResponse[]): void {
    this.gauges.chartUsageKwh.reset();
    this.gauges.chartUsageTotalKwh.reset();
    this.gauges.chartCharge.reset();

    for (const chart of charts) {
      let currentUsageTotal = 0;
      let previousDayUsageTotal = 0;
      let lastYearUsageTotal = 0;

      for (const item of chart.items) {
        const labels = {
          period: chart.period,
          measured_at: item.measuredAt,
          measured_date: item.measuredDate ?? '',
        };

        this.gauges.chartUsageKwh.set(
          { ...labels, series: 'current' },
          item.usageKwh,
        );
        currentUsageTotal += item.usageKwh;
        this.gauges.chartUsageKwh.set(
          { ...labels, series: 'previous_day' },
          item.previousDayUsageKwh,
        );
        previousDayUsageTotal += item.previousDayUsageKwh;
        this.gauges.chartUsageKwh.set(
          { ...labels, series: 'last_year' },
          item.lastYearUsageKwh,
        );
        lastYearUsageTotal += item.lastYearUsageKwh;

        this.gauges.chartCharge.set(
          { ...labels, series: 'current' },
          item.charge,
        );
        this.gauges.chartCharge.set(
          { ...labels, series: 'previous_day' },
          item.previousDayCharge,
        );
        this.gauges.chartCharge.set(
          { ...labels, series: 'last_year' },
          item.lastYearCharge,
        );
      }

      this.gauges.chartUsageTotalKwh.set(
        { period: chart.period, series: 'current' },
        currentUsageTotal,
      );
      this.gauges.chartUsageTotalKwh.set(
        { period: chart.period, series: 'previous_day' },
        previousDayUsageTotal,
      );
      this.gauges.chartUsageTotalKwh.set(
        { period: chart.period, series: 'last_year' },
        lastYearUsageTotal,
      );
    }
  }
}
