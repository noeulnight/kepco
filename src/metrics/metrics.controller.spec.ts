import { KepcoSmartUsageMenuType } from '../kepco/type/smart-usage-menu-type.enum';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  it('returns Prometheus metrics content after a successful refresh', async () => {
    const kepcoService = {
      getSmartUsageFee: jest.fn().mockResolvedValue({
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
          realtimeKwh: 50,
          predictedKwh: 80,
          currentTier: 1,
          predictedTier: 2,
          unitPrice: 100,
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
            kw: 2,
            appliedAt: '2026-04-16 10:00',
          },
          baseCharge: {
            unitPrice: 730,
            amount: 900,
          },
          energyCharge: 4000,
          realtimeEnergyCharge: 3800,
          subtotalCharge: 4900,
          vatCharge: 490,
          fundCharge: 120,
          realtimeTotalCharge: 5510,
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
          charge: 6000,
          subtotalCharge: 6400,
          realtimeSubtotalCharge: 6200,
          baseCharge: 900,
          vatCharge: 640,
          fundCharge: 160,
          totalCharge: 7200,
        },
      }),
      getSmartUsageChart: jest
        .fn()
        .mockImplementation((input: { period: KepcoSmartUsageMenuType }) =>
          Promise.resolve({
            period: input.period,
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
          }),
        ),
    };
    const service = new MetricsService(kepcoService as never);
    const controller = new MetricsController(service);

    await service.refreshMetrics();
    const metrics = await controller.getMetrics();

    expect(service.getContentType()).toBe(
      'text/plain; version=0.0.4; charset=utf-8',
    );
    expect(metrics).toContain('kepco_usage_realtime_kwh 50');
    expect(metrics).toContain(
      'kepco_chart_usage_kwh{period="time",measured_at="10",measured_date="2026-04-16",series="current"} 1.2',
    );
    expect(metrics).toContain(
      'kepco_chart_usage_total_kwh{period="time",series="current"} 3.5',
    );
  });
});
