import { Logger } from '@nestjs/common';
import type { KepcoSmartUsageChartResponse } from '../kepco/type/smart-usage-chart-response.type';
import type { KepcoSmartUsageFeeResponse } from '../kepco/type/smart-usage-fee-response.type';
import { KepcoSmartUsageMenuType } from '../kepco/type/smart-usage-menu-type.enum';
import { MetricsService } from './metrics.service';

const createUsageResponse = (
  overrides: Partial<KepcoSmartUsageFeeResponse> = {},
): KepcoSmartUsageFeeResponse => ({
  customer: {
    electricityRateName: 'Residential',
    electricityRateCode: 'A1',
    specialCaseName: 'None',
    specialCaseCode: 'N',
    householdCount: 1,
  },
  period: {
    billingPeriodStartDate: '2026-04-01',
    selectedDate: '2026-04-16',
    billingPeriodEndDate: '2026-04-30',
    elapsedBillingDays: 16,
    billingCycleDays: 30,
  },
  usage: {
    realtimeKwh: 123,
    predictedKwh: 210,
    currentTier: 2,
    predictedTier: 3,
    unitPrice: 187,
    rateTiers: {
      tier1: 100,
      tier2: 200,
      tier3: 300,
      tier4: 400,
      tier5: 500,
      tier6: 600,
    },
  },
  billing: {
    demand: {
      kw: 4.5,
      appliedAt: '2026-04-16 10:00',
    },
    baseCharge: {
      unitPrice: 730,
      amount: 1400,
    },
    energyCharge: 9800,
    realtimeEnergyCharge: 9100,
    subtotalCharge: 11200,
    vatCharge: 1120,
    fundCharge: 370,
    realtimeTotalCharge: 12690,
  },
  tou: {
    demand: {
      kw: 0,
      appliedAt: '',
    },
    baseCharge: {
      unitPrice: 0,
      amount: 0,
    },
  },
  predicted: {
    charge: 15100,
    subtotalCharge: 16100,
    realtimeSubtotalCharge: 15800,
    baseCharge: 1400,
    vatCharge: 1610,
    fundCharge: 530,
    totalCharge: 18240,
  },
  ...overrides,
});

const createChartResponse = (
  period: KepcoSmartUsageMenuType,
): KepcoSmartUsageChartResponse => ({
  period,
  items: [
    {
      label: '10',
      measuredAt: '10',
      measuredDate: '2026-04-16',
      usageKwh: 1.2,
      charge: 120,
      previousDayUsageKwh: 1.1,
      previousDayCharge: 110,
      lastYearUsageKwh: 0.9,
      lastYearCharge: 90,
    },
    {
      label: '11',
      measuredAt: '11',
      measuredDate: '2026-04-16',
      usageKwh: 2.3,
      charge: 230,
      previousDayUsageKwh: 2.1,
      previousDayCharge: 210,
      lastYearUsageKwh: 1.5,
      lastYearCharge: 150,
    },
  ],
});

describe('MetricsService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes KEPCO gauges and no custom HTTP metrics after a successful refresh', async () => {
    const kepcoService = {
      getSmartUsageFee: jest.fn().mockResolvedValue(createUsageResponse()),
      getSmartUsageChart: jest
        .fn()
        .mockImplementation((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        ),
    };
    const service = new MetricsService(kepcoService as never);

    await service.refreshMetrics();

    const metrics = await service.getMetrics();

    expect(metrics).toContain('kepco_usage_realtime_kwh 123');
    expect(metrics).toContain('kepco_usage_predicted_kwh 210');
    expect(metrics).toContain('kepco_billing_demand_kw 4.5');
    expect(metrics).toContain('kepco_predicted_total_charge 18240');
    expect(metrics).toContain(
      'kepco_chart_usage_kwh{period="time",measured_at="10",measured_date="2026-04-16",series="current"} 1.2',
    );
    expect(metrics).toContain(
      'kepco_chart_usage_total_kwh{period="time",series="current"} 3.5',
    );
    expect(metrics).toContain(
      'kepco_chart_charge{period="year",measured_at="10",measured_date="2026-04-16",series="last_year"} 90',
    );
    expect(metrics).not.toContain('kepco_http_requests_total');
    expect(metrics).not.toContain('kepco_http_request_duration_seconds');
  });

  it('keeps the last successful values when a later refresh fails', async () => {
    const kepcoService = {
      getSmartUsageFee: jest
        .fn()
        .mockResolvedValueOnce(createUsageResponse())
        .mockRejectedValueOnce(new Error('boom')),
      getSmartUsageChart: jest
        .fn()
        .mockImplementationOnce((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        )
        .mockImplementationOnce((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        )
        .mockImplementationOnce((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        )
        .mockImplementationOnce((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        )
        .mockRejectedValueOnce(new Error('boom')),
    };
    const service = new MetricsService(kepcoService as never);

    await service.refreshMetrics();
    await service.refreshMetrics();

    const metrics = await service.getMetrics();

    expect(metrics).toContain('kepco_usage_realtime_kwh 123');
    expect(metrics).toContain('kepco_predicted_total_charge 18240');
    expect(metrics).toContain(
      'kepco_chart_usage_kwh{period="month",measured_at="10",measured_date="2026-04-16",series="previous_day"} 1.1',
    );
    expect(metrics).toContain(
      'kepco_chart_usage_total_kwh{period="time",series="previous_day"} 3.2',
    );
  });

  it('keeps the last successful chart values when a later chart refresh fails', async () => {
    const kepcoService = {
      getSmartUsageFee: jest.fn().mockResolvedValue(createUsageResponse()),
      getSmartUsageChart: jest
        .fn()
        .mockImplementationOnce((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        )
        .mockImplementationOnce((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        )
        .mockImplementationOnce((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        )
        .mockImplementationOnce((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve(createChartResponse(input.period)),
        )
        .mockRejectedValueOnce(new Error('boom')),
    };
    const service = new MetricsService(kepcoService as never);

    await service.refreshMetrics();
    await service.refreshMetrics();

    const metrics = await service.getMetrics();

    expect(metrics).toContain(
      'kepco_chart_charge{period="day",measured_at="10",measured_date="2026-04-16",series="current"} 120',
    );
    expect(metrics).toContain(
      'kepco_chart_usage_total_kwh{period="year",series="last_year"} 2.4',
    );
  });
});
