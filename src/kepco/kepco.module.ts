import { Module } from '@nestjs/common';
import { KepcoController } from './kepco.controller';
import { KepcoService } from './kepco.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://pp.kepco.co.kr',
      headers: {
        Origin: 'https://pp.kepco.co.kr',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      },
    }),
  ],
  controllers: [KepcoController],
  providers: [KepcoService],
  exports: [KepcoService],
})
export class KepcoModule {}
