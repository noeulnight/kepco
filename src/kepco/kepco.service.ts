import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, constants, publicEncrypt } from 'node:crypto';
import { isAxiosError } from 'axios';
import type { AxiosResponse, RawAxiosRequestHeaders } from 'axios';
import { firstValueFrom } from 'rxjs';
import type { KepcoAuthCheckUserResponse } from './type/auth-check-user-response.type';
import type { KepcoAuthEncryptionCookies } from './type/auth-encryption-cookies.type';
import type { KepcoAuthLoginFormPayload } from './type/auth-login-form-payload.type';
import type { KepcoAuthLoginPayload } from './type/auth-login-payload.type';
import type { KepcoAuthRequestConfig } from './type/auth-request-config.type';
import type { KepcoAuthSession } from './type/auth-session.type';
import { KepcoAuthUserType } from './type/auth-user-type.enum';
import type { KepcoSmartUsageChartRawItem } from './type/smart-usage-chart-raw-item.type';
import type { KepcoSmartUsageChartRequest } from './type/smart-usage-chart-request.type';
import type { KepcoSmartUsageChartResponse } from './type/smart-usage-chart-response.type';
import { KepcoSmartUsageMenuType } from './type/smart-usage-menu-type.enum';
import type { KepcoSmartUsageFeeRawResponse } from './type/smart-usage-fee-raw-response.type';
import type { KepcoSmartUsageFeeRequest } from './type/smart-usage-fee-request.type';
import type { KepcoSmartUsageFeeResponse } from './type/smart-usage-fee-response.type';
import { KepcoYesNo } from './type/yes-no.enum';

class KepcoAuthenticationResponseError extends Error {
  constructor() {
    super('KEPCO returned an unauthenticated response body');
  }
}

@Injectable()
export class KepcoService {
  private session: KepcoAuthSession | null = null;
  private loginPromise: Promise<KepcoAuthSession> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getSmartUsageFee(
    payload: KepcoSmartUsageFeeRequest = {
      period: KepcoSmartUsageMenuType.Time,
      TOU: false,
    },
  ): Promise<KepcoSmartUsageFeeResponse> {
    const response = await this.requestWithAuth<KepcoSmartUsageFeeRawResponse>({
      method: 'POST',
      url: '/rm/getRM0201.do',
      data: {
        menuType: payload.period,
        TOU: payload.TOU,
      },
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json',
        Referer: 'https://pp.kepco.co.kr/rm/rm0201.do?menu_id=O020101',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    return this.mapSmartUsageFeeResponse(response.data);
  }

  async getSmartUsageChart(
    payload: KepcoSmartUsageChartRequest = {
      period: KepcoSmartUsageMenuType.Time,
    },
  ): Promise<KepcoSmartUsageChartResponse> {
    const response = await this.requestWithAuth<KepcoSmartUsageChartRawItem[]>({
      method: 'POST',
      url: '/rm/rm0201_chart.do',
      data: {
        menuType: payload.period,
      },
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json',
        Referer: 'https://pp.kepco.co.kr/rm/rm0201.do?menu_id=O020101',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    return this.mapSmartUsageChartResponse(payload.period, response.data);
  }

  async requestWithAuth<T>(
    config: KepcoAuthRequestConfig,
  ): Promise<AxiosResponse<T>> {
    const session = await this.ensureAuthenticated();

    try {
      const response = await this.sendAuthenticatedRequest<T>(
        config,
        session.cookieHeader,
      );
      const responseData = this.asRecord(response.data);

      if (
        responseData['access-denied'] === true ||
        this.trimValue(responseData.cause) === 'AUTHORIZATION_FAILURE' ||
        this.trimValue(responseData.message) === 'Please login first.'
      ) {
        throw new KepcoAuthenticationResponseError();
      }

      return response;
    } catch (error) {
      if (
        !this.isUnauthorized(error) &&
        !(error instanceof KepcoAuthenticationResponseError)
      ) {
        throw error;
      }

      const refreshedSession = await this.ensureAuthenticated(true);
      const response = await this.sendAuthenticatedRequest<T>(
        config,
        refreshedSession.cookieHeader,
      );

      const responseData = this.asRecord(response.data);

      if (
        responseData['access-denied'] === true ||
        this.trimValue(responseData.cause) === 'AUTHORIZATION_FAILURE' ||
        this.trimValue(responseData.message) === 'Please login first.'
      ) {
        throw new KepcoAuthenticationResponseError();
      }

      return response;
    }
  }

  private async ensureAuthenticated(
    forceRefresh = false,
  ): Promise<KepcoAuthSession> {
    if (!forceRefresh && this.session) {
      return this.session;
    }

    if (!forceRefresh && this.loginPromise) {
      return this.loginPromise;
    }

    this.loginPromise = this.login();

    try {
      this.session = await this.loginPromise;
      return this.session;
    } finally {
      this.loginPromise = null;
    }
  }

  private async login(): Promise<KepcoAuthSession> {
    const kepcoId = this.configService.getOrThrow<string>('KEPCO_ID');
    const kepcoPw = this.configService.getOrThrow<string>('KEPCO_PW');
    const { cookieHeader, response } = await this.submitLogin(kepcoId, kepcoPw);

    return {
      cookieHeader: this.mergeCookieHeaders(
        cookieHeader,
        response.headers['set-cookie'],
      ),
    };
  }

  private async sendAuthenticatedRequest<T>(
    config: KepcoAuthRequestConfig,
    cookieHeader: string,
  ): Promise<AxiosResponse<T>> {
    return firstValueFrom(
      this.httpService.request<T>({
        ...config,
        headers: this.createHeaders(cookieHeader, config.headers),
      }),
    );
  }

  private isUnauthorized(error: unknown): boolean {
    return isAxiosError(error) && error.response?.status === 401;
  }

  private async buildLoginPayloadContext(
    userId: string,
    password: string,
  ): Promise<{
    cookieHeader: string;
    payload: KepcoAuthLoginPayload;
  }> {
    const { cookieSsId, cookieRsa, cookieHeader } =
      await this.getEncryptionCookie();
    const decodedCookieSsId = decodeURIComponent(cookieSsId);
    const encryptedUserId = this.encryptCredential(userId, cookieRsa);
    const encryptedPassword = this.encryptCredential(password, cookieRsa);

    return {
      cookieHeader,
      payload: {
        USER_ID: `${decodedCookieSsId}_${encryptedUserId}`,
        USER_PWD: `${decodedCookieSsId}_${encryptedPassword}`,
        USER_CI: '',
        TYPE: KepcoAuthUserType.Individual,
      },
    };
  }

  private async submitLogin(
    userId: string,
    password: string,
  ): Promise<{
    cookieHeader: string;
    response: AxiosResponse<string>;
  }> {
    const { cookieHeader, payload } = await this.buildLoginPayloadContext(
      userId,
      password,
    );
    const loginPayload = await this.buildLoginFormPayload(
      userId,
      payload,
      cookieHeader,
    );

    const response = await firstValueFrom(
      this.httpService.post<string>(
        '/login',
        new URLSearchParams(loginPayload),
        {
          headers: this.createHeaders(cookieHeader, {
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
        },
      ),
    );

    return { cookieHeader, response };
  }

  private async buildLoginFormPayload(
    rawUserId: string,
    payload: KepcoAuthLoginPayload,
    cookieHeader: string,
  ): Promise<KepcoAuthLoginFormPayload> {
    const ssoId = await this.getSsoId(payload, cookieHeader);

    return {
      ...payload,
      APT_YN: this.isApartmentUser(rawUserId) ? KepcoYesNo.Yes : KepcoYesNo.No,
      SSO_ID: ssoId,
    };
  }

  private async getSsoId(
    payload: KepcoAuthLoginPayload,
    cookieHeader: string,
  ): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post<KepcoAuthCheckUserResponse>(
        '/intro/chkUser.do',
        payload,
        {
          headers: this.createHeaders(cookieHeader, {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/json',
            Referer: 'https://pp.kepco.co.kr/intro.do',
            'X-Requested-With': 'XMLHttpRequest',
          }),
        },
      ),
    );

    if (response.data?.USER_SSO_YN) {
      return response.data.USER_SSO_YN;
    }

    if (response.data?.result === 'success') {
      return KepcoYesNo.Yes;
    }

    return KepcoYesNo.No;
  }

  private isApartmentUser(userId: string): boolean {
    return userId.length > 10 || userId === 'user38';
  }

  private createHeaders(
    cookieHeader: string,
    extraHeaders: RawAxiosRequestHeaders = {},
  ): RawAxiosRequestHeaders {
    return {
      Cookie: cookieHeader,
      ...extraHeaders,
    };
  }

  private mergeCookieHeaders(
    currentCookieHeader: unknown,
    nextSetCookie: unknown,
  ): string {
    const cookies = {
      ...this.parseCookieHeader(
        typeof currentCookieHeader === 'string' ? currentCookieHeader : '',
      ),
      ...this.parseSetCookie(nextSetCookie),
    };

    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  private parseCookieHeader(cookieHeader: string): Record<string, string> {
    return cookieHeader
      .split(';')
      .map((cookieValue) => cookieValue.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, cookieValue) => {
        const separatorIndex = cookieValue.indexOf('=');

        if (separatorIndex === -1) return acc;

        acc[cookieValue.slice(0, separatorIndex)] = cookieValue.slice(
          separatorIndex + 1,
        );
        return acc;
      }, {});
  }

  private parseSetCookie(setCookie: unknown): Record<string, string> {
    if (!Array.isArray(setCookie)) {
      return {};
    }

    return setCookie.reduce<Record<string, string>>((acc, cookieValue) => {
      if (typeof cookieValue !== 'string') {
        return acc;
      }

      const cookieString = cookieValue.split(';', 1)[0];
      const separatorIndex = cookieString.indexOf('=');

      if (separatorIndex === -1) return acc;

      acc[cookieString.slice(0, separatorIndex)] = cookieString.slice(
        separatorIndex + 1,
      );
      return acc;
    }, {});
  }

  private mapSmartUsageFeeResponse(
    data: KepcoSmartUsageFeeRawResponse,
  ): KepcoSmartUsageFeeResponse {
    const safeData = this.asRecord(data);

    return {
      customer: {
        electricityRateName: this.trimValue(safeData.CNTR_KND_NM),
        electricityRateCode: this.toStringValue(safeData.ELEC_CAR_CD),
        specialCaseName: this.trimValue(safeData.ELEC_CAR_NM),
        specialCaseCode: this.toStringValue(safeData.ELEC_CAR_CD),
        householdCount: this.toNumber(safeData.HSHCNT),
      },
      period: {
        billingPeriodStartDate: this.trimValue(safeData.START_DT),
        selectedDate: this.trimValue(safeData.SELECT_DT),
        billingPeriodEndDate: this.trimValue(safeData.END_DT),
        elapsedBillingDays: this.toNumber(safeData.DT),
        billingCycleDays: this.toNumber(safeData.ET),
      },
      usage: {
        realtimeKwh: this.toNumber(safeData.F_AP_QT),
        predictedKwh: this.toNumber(safeData.PREDICT_TOT),
        currentTier: this.toNumber(safeData.KWH_TYPE),
        predictedTier: this.toNumber(safeData.PREDICT_BILL_LEVEL),
        unitPrice: this.toNumber(safeData.UNIT_PRICE),
        rateTiers: {
          tier1: this.toNumber(safeData.USEKWH_UCOST1),
          tier2: this.toNumber(safeData.USEKWH_UCOST2),
          tier3: this.toNumber(safeData.USEKWH_UCOST3),
          tier4: this.toNumber(safeData.USEKWH_UCOST4),
          tier5: this.toNumber(safeData.USEKWH_UCOST5),
          tier6: this.toNumber(safeData.USEKWH_UCOST6),
        },
      },
      billing: {
        demand: {
          kw: this.toNumber(safeData.JOJ_KW),
          appliedAt: this.trimValue(safeData.JOJ_KW_TIME),
        },
        baseCharge: {
          unitPrice: this.toNumber(safeData.BASE_BILL_UCOST),
          amount: this.toNumber(safeData.BASE_BILL),
        },
        energyCharge: this.toNumber(safeData.KWH_BILL),
        realtimeEnergyCharge: this.toNumber(safeData.REAL_KWH_BILL),
        subtotalCharge: this.toNumber(safeData.TOT_BILL),
        vatCharge: this.toNumber(safeData.VAT_BILL),
        fundCharge: this.toNumber(safeData.FUND_BILL),
        realtimeTotalCharge: this.toNumber(safeData.TOTAL_CHARGE),
      },
      tou: {
        demand: {
          kw: this.toNumber(safeData.TOU_JOJ_KW),
          appliedAt: this.trimValue(safeData.TOU_JOJ_KW_TIME),
        },
        baseCharge: {
          unitPrice: this.toNumber(safeData.TOU_BASE_BILL_UCOST),
          amount: this.toNumber(safeData.TOU_BASE_BILL),
        },
      },
      predicted: {
        charge: this.toNumber(safeData.PREDICT_BILL),
        subtotalCharge: this.toNumber(safeData.PREDICT_TOT_BILL),
        realtimeSubtotalCharge: this.toNumber(safeData.REAL_PREDICT_TOT_BILL),
        baseCharge: this.toNumber(safeData.PREDICT_BASE_BILL),
        vatCharge: this.toNumber(safeData.PREDICT_VAT_BILL),
        fundCharge: this.toNumber(safeData.PREDICT_FUND_BILL),
        totalCharge: this.toNumber(safeData.PREDICT_TOTAL_CHARGE),
      },
    };
  }

  private mapSmartUsageChartResponse(
    period: KepcoSmartUsageChartRequest['period'],
    data: KepcoSmartUsageChartRawItem[],
  ): KepcoSmartUsageChartResponse {
    const items = Array.isArray(data) ? data : [];

    return {
      period,
      items: items.map((item) => ({
        label: this.formatChartLabel(period, this.toStringValue(item?.MR_HHMI)),
        measuredAt: this.toStringValue(item?.MR_HHMI),
        measuredDate: this.toOptionalStringValue(item?.MR_YMD),
        usageKwh: this.toNumber(item?.F_AP_QT),
        charge: this.toNumber(item?.KWH_BILL),
        previousDayUsageKwh: this.toNumber(item?.LDAY_F_AP_QT),
        previousDayCharge: this.toNumber(item?.LDAY_KWH_BILL),
        lastYearUsageKwh: this.toNumber(item?.LYEAR_F_AP_QT),
        lastYearCharge: this.toNumber(item?.LYEAR_KWH_BILL),
      })),
    };
  }

  private formatChartLabel(
    period: KepcoSmartUsageChartRequest['period'],
    measuredAt: string,
  ): string {
    if (period === KepcoSmartUsageMenuType.Month) {
      const month = measuredAt.slice(3, 5);
      return month.startsWith('0') ? month.slice(1) : month;
    }

    if (period === KepcoSmartUsageMenuType.Year) {
      return `${measuredAt}년`;
    }

    const hour = measuredAt.slice(0, 2);
    return hour.startsWith('0') ? hour.slice(1) : hour;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private trimValue(value: unknown): string {
    return this.toStringValue(value).trim();
  }

  private toStringValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '';
    }

    return '';
  }

  private toOptionalStringValue(value: unknown): string | undefined {
    const normalized = this.trimValue(value);

    return normalized === '' ? undefined : normalized;
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const normalized = this.trimValue(value).replaceAll(',', '');

    if (normalized === '') {
      return 0;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private encryptCredential(value: string, modulusHex: string): string {
    const publicKey = createPublicKey({
      key: {
        n: this.toBase64Url(Buffer.from(modulusHex, 'hex')),
        kty: 'RSA',
        e: 'AQAB',
      },
      format: 'jwk',
    });

    return publicEncrypt(
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(value, 'utf8'),
    ).toString('hex');
  }

  private toBase64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private async getEncryptionCookie(): Promise<KepcoAuthEncryptionCookies> {
    const response = await firstValueFrom(this.httpService.get('/intro.do'));
    const cookie = response.headers['set-cookie'];

    if (!Array.isArray(cookie)) {
      throw new Error('Failed to get encryption cookie');
    }

    const parsedCookie = this.parseSetCookie(cookie);
    const cookieSsId = parsedCookie.cookieSsId;
    const cookieRsa = parsedCookie.cookieRsa;

    if (!cookieSsId || !cookieRsa) {
      throw new Error('Failed to parse KEPCO encryption cookies');
    }

    return {
      cookieSsId,
      cookieRsa,
      cookieHeader: this.mergeCookieHeaders('', cookie),
    };
  }
}
