import { Module } from '@nestjs/common';
import { KepcoModule } from '../kepco/kepco.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [KepcoModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
