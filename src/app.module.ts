import { Module } from '@nestjs/common';
import { KepcoModule } from './kepco/kepco.module';
import { ConfigModule } from '@nestjs/config';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MetricsModule,
    KepcoModule,
  ],
})
export class AppModule {}
