import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import { KepcoService } from './kepco.service';
import type { KepcoAuthSession } from './type/auth-session.type';
import type { KepcoSmartUsageChartRawItem } from './type/smart-usage-chart-raw-item.type';
import type { KepcoSmartUsageChartResponse } from './type/smart-usage-chart-response.type';
import { KepcoSmartUsageMenuType } from './type/smart-usage-menu-type.enum';
import type { KepcoSmartUsageFeeRawResponse } from './type/smart-usage-fee-raw-response.type';
import type { KepcoSmartUsageFeeResponse } from './type/smart-usage-fee-response.type';

describe('KepcoService', () => {
  const createService = () =>
    new KepcoService({} as HttpService, {} as ConfigService);
  const createAxiosResponse = <T>(data: T): AxiosResponse<T> =>
    ({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: {},
      },
    }) as AxiosResponse<T>;
  const createAxiosError = (message: string, code?: string): AxiosError =>
    Object.assign(new AxiosError(message, code), {
      config: {
        headers: {},
      },
    });
  const mapSmartUsageFeeResponse = (
    service: KepcoService,
    data: KepcoSmartUsageFeeRawResponse,
  ): KepcoSmartUsageFeeResponse => {
    const mapper = Reflect.get(service, 'mapSmartUsageFeeResponse') as (
      payload: KepcoSmartUsageFeeRawResponse,
    ) => KepcoSmartUsageFeeResponse;

    return mapper.call(service, data) as KepcoSmartUsageFeeResponse;
  };
  const mapSmartUsageChartResponse = (
    service: KepcoService,
    period: KepcoSmartUsageMenuType,
    data: KepcoSmartUsageChartRawItem[],
  ): KepcoSmartUsageChartResponse => {
    const mapper = Reflect.get(service, 'mapSmartUsageChartResponse') as (
      chartPeriod: KepcoSmartUsageMenuType,
      payload: KepcoSmartUsageChartRawItem[],
    ) => KepcoSmartUsageChartResponse;

    return mapper.call(service, period, data) as KepcoSmartUsageChartResponse;
  };
  const ensureAuthenticated = (
    service: KepcoService,
    forceRefresh?: boolean,
  ): Promise<KepcoAuthSession> =>
    (
      Reflect.get(service as never, 'ensureAuthenticated') as (
        this: KepcoService,
        forceRefresh?: boolean,
      ) => Promise<KepcoAuthSession>
    ).call(service, forceRefresh) as Promise<KepcoAuthSession>;

  it('normalizes missing smart usage fee fields instead of throwing', () => {
    const service = createService();

    const response = mapSmartUsageFeeResponse(service, {
      ELEC_CAR_CD: 'A1',
      HSHCNT: 2,
      DT: 5,
      ET: 30,
      F_AP_QT: '123.4',
      PREDICT_TOT: undefined,
      KWH_TYPE: '2',
      PREDICT_BILL_LEVEL: null,
      UNIT_PRICE: '187',
      USEKWH_UCOST1: 100,
      USEKWH_UCOST2: undefined,
      USEKWH_UCOST3: null,
      USEKWH_UCOST4: 400,
      USEKWH_UCOST5: '500',
      USEKWH_UCOST6: 'bad',
      JOJ_KW: 4.5,
      BASE_BILL_UCOST: '730',
      BASE_BILL: '1,400',
      KWH_BILL: '9,800',
      REAL_KWH_BILL: '',
      TOT_BILL: '11,200',
      VAT_BILL: '1,120',
      FUND_BILL: '370',
      TOTAL_CHARGE: '12,690',
      TOU_JOJ_KW: undefined,
      TOU_BASE_BILL_UCOST: null,
      TOU_BASE_BILL: '',
      PREDICT_BILL: '15,100',
      PREDICT_TOT_BILL: '16,100',
      REAL_PREDICT_TOT_BILL: undefined,
      PREDICT_BASE_BILL: '1,400',
      PREDICT_VAT_BILL: null,
      PREDICT_FUND_BILL: '530',
      PREDICT_TOTAL_CHARGE: '18,240',
    } as KepcoSmartUsageFeeRawResponse);

    expect(response.customer.electricityRateName).toBe('');
    expect(response.customer.specialCaseName).toBe('');
    expect(response.period.billingPeriodStartDate).toBe('');
    expect(response.billing.demand.appliedAt).toBe('');
    expect(response.tou.demand.appliedAt).toBe('');
    expect(response.usage.predictedKwh).toBe(0);
    expect(response.usage.predictedTier).toBe(0);
    expect(response.usage.rateTiers.tier2).toBe(0);
    expect(response.usage.rateTiers.tier6).toBe(0);
    expect(response.tou.demand.kw).toBe(0);
    expect(response.predicted.realtimeSubtotalCharge).toBe(0);
    expect(response.predicted.vatCharge).toBe(0);
  });

  it('returns an empty chart when KEPCO responds with a non-array payload', () => {
    const service = createService();

    const response = mapSmartUsageChartResponse(
      service,
      KepcoSmartUsageMenuType.Time,
      { items: [] } as unknown as KepcoSmartUsageChartRawItem[],
    );

    expect(response).toEqual({
      period: KepcoSmartUsageMenuType.Time,
      items: [],
    });
  });

  it('normalizes partial chart items instead of throwing', () => {
    const service = createService();

    const response = mapSmartUsageChartResponse(
      service,
      KepcoSmartUsageMenuType.Time,
      [
        {
          MR_HHMI: undefined,
          MR_YMD: ' 2026-04-16 ',
          F_AP_QT: '1.2',
          KWH_BILL: null,
          LDAY_F_AP_QT: undefined,
          LDAY_KWH_BILL: '110',
          LYEAR_F_AP_QT: 'bad',
          LYEAR_KWH_BILL: 90,
        },
      ] as KepcoSmartUsageChartRawItem[],
    );

    expect(response.items).toEqual([
      {
        label: '',
        measuredAt: '',
        measuredDate: '2026-04-16',
        usageKwh: 1.2,
        charge: 0,
        previousDayUsageKwh: 0,
        previousDayCharge: 110,
        lastYearUsageKwh: 0,
        lastYearCharge: 90,
      },
    ]);
  });

  it('re-authenticates when KEPCO returns a 200 login-first payload', async () => {
    const service = createService();
    const ensureAuthenticated = jest
      .spyOn(service as never, 'ensureAuthenticated')
      .mockResolvedValueOnce({
        cookieHeader: 'stale-session',
        createdAt: 0,
        expiresAt: 1,
      })
      .mockResolvedValueOnce({
        cookieHeader: 'fresh-session',
        createdAt: 2,
        expiresAt: 3,
      });
    const sendAuthenticatedRequest = jest
      .spyOn(service as never, 'sendAuthenticatedRequest')
      .mockResolvedValueOnce(
        createAxiosResponse({
          message: 'Please login first.',
          'access-denied': true,
          cause: 'AUTHORIZATION_FAILURE',
        }),
      )
      .mockResolvedValueOnce(
        createAxiosResponse({
          ok: true,
        }),
      );

    const response = await service.requestWithAuth({
      method: 'POST',
      url: '/rm/getRM0201.do',
    });

    expect(response.data).toEqual({
      ok: true,
    });
    expect(ensureAuthenticated).toHaveBeenNthCalledWith(1);
    expect(ensureAuthenticated).toHaveBeenNthCalledWith(2, true);
    expect(sendAuthenticatedRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: '/rm/getRM0201.do' }),
      'stale-session',
    );
    expect(sendAuthenticatedRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: '/rm/getRM0201.do' }),
      'fresh-session',
    );
  });

  it('reuses an unexpired session', async () => {
    const service = createService();
    const login = jest.spyOn(service as never, 'login').mockResolvedValue({
      cookieHeader: 'cached-session',
      createdAt: 1_000,
      expiresAt: 1_000 + 12 * 60 * 60 * 1000,
    });
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(1_000);

    Reflect.set(service as never, 'session', {
      cookieHeader: 'cached-session',
      createdAt: 1_000,
      expiresAt: 1_000 + 12 * 60 * 60 * 1000,
    });

    const session = await ensureAuthenticated(service);

    expect(session).toEqual({
      cookieHeader: 'cached-session',
      createdAt: 1_000,
      expiresAt: 1_000 + 12 * 60 * 60 * 1000,
    });
    expect(login).not.toHaveBeenCalled();
    dateNow.mockRestore();
  });

  it('refreshes the session before ttl expiry', async () => {
    const service = createService();
    const refreshedSession = {
      cookieHeader: 'fresh-session',
      createdAt: 200,
      expiresAt: 300,
    };
    const login = jest
      .spyOn(service as never, 'login')
      .mockResolvedValue(refreshedSession);
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(100);

    Reflect.set(service as never, 'session', {
      cookieHeader: 'stale-session',
      createdAt: 0,
      expiresAt: 100 + 10 * 60 * 1000,
    });

    const session = await ensureAuthenticated(service);

    expect(session).toEqual(refreshedSession);
    expect(login).toHaveBeenCalledTimes(1);
    dateNow.mockRestore();
  });

  it('re-authenticates when KEPCO closes the socket with a stale session', async () => {
    const service = createService();
    const ensureAuthenticated = jest
      .spyOn(service as never, 'ensureAuthenticated')
      .mockResolvedValueOnce({
        cookieHeader: 'stale-session',
        createdAt: 0,
        expiresAt: 1,
      })
      .mockResolvedValueOnce({
        cookieHeader: 'fresh-session',
        createdAt: 2,
        expiresAt: 3,
      });
    const sendAuthenticatedRequest = jest
      .spyOn(service as never, 'sendAuthenticatedRequest')
      .mockRejectedValueOnce(createAxiosError('socket hang up', 'ECONNRESET'))
      .mockResolvedValueOnce(
        createAxiosResponse({
          ok: true,
        }),
      );

    const response = await service.requestWithAuth({
      method: 'POST',
      url: '/rm/getRM0201.do',
    });

    expect(response.data).toEqual({
      ok: true,
    });
    expect(ensureAuthenticated).toHaveBeenNthCalledWith(1);
    expect(ensureAuthenticated).toHaveBeenNthCalledWith(2, true);
    expect(sendAuthenticatedRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: '/rm/getRM0201.do' }),
      'stale-session',
    );
    expect(sendAuthenticatedRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: '/rm/getRM0201.do' }),
      'fresh-session',
    );
  });
});
