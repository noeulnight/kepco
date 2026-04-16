export type KepcoSmartUsageFeeResponse = {
  customer: {
    electricityRateName: string; // 적용 전기요금명
    electricityRateCode: string; // 전기요금/특례 코드
    specialCaseName: string; // 특례유형명
    specialCaseCode: string; // 특례유형 코드
    householdCount: number; // 세대수
  };
  period: {
    billingPeriodStartDate: string; // 청구 시작일
    selectedDate: string; // 조회 기준일
    billingPeriodEndDate: string; // 청구 종료일
    elapsedBillingDays: number; // 현재까지 경과일
    billingCycleDays: number; // 청구 주기 총일수
  };
  usage: {
    realtimeKwh: number; // 실시간 사용량(kWh)
    predictedKwh: number; // 예상 사용량(kWh)
    currentTier: number; // 현재 사용량 구간
    predictedTier: number; // 예상 사용량 구간
    unitPrice: number; // 화면 기준 단가 구분값
    rateTiers: {
      tier1: number; // 1단계 전력량요금 단가
      tier2: number; // 2단계 전력량요금 단가
      tier3: number; // 3단계 전력량요금 단가
      tier4: number; // 계절/시간대 전력량요금 단가 1
      tier5: number; // 계절/시간대 전력량요금 단가 2
      tier6: number; // 계절/시간대 전력량요금 단가 3
    };
  };
  billing: {
    demand: {
      kw: number; // 요금적용전력
      appliedAt: string; // 요금적용전력 산정 시점
    };
    baseCharge: {
      unitPrice: number; // 기본요금 단가
      amount: number; // 기본요금
    };
    energyCharge: number; // 전력량요금
    realtimeEnergyCharge: number; // 실시간 기준 전력량요금
    subtotalCharge: number; // 소계 요금
    vatCharge: number; // 부가가치세
    fundCharge: number; // 전력산업기반기금
    realtimeTotalCharge: number; // 실시간 총요금
  };
  tou: {
    demand: {
      kw: number; // 계시별 선택요금 적용전력
      appliedAt: string; // 계시별 선택요금 적용전력 산정 시점
    };
    baseCharge: {
      unitPrice: number; // 계시별 선택요금 기본요금 단가
      amount: number; // 계시별 선택요금 기본요금
    };
  };
  predicted: {
    charge: number; // 예상 청구요금
    subtotalCharge: number; // 예상 소계 요금
    realtimeSubtotalCharge: number; // 실시간 기준 예상 소계 요금
    baseCharge: number; // 예상 기본요금
    vatCharge: number; // 예상 부가가치세
    fundCharge: number; // 예상 전력산업기반기금
    totalCharge: number; // 예상 총요금
  };
};
