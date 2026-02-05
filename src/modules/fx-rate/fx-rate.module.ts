import { Module } from '@nestjs/common';
import { FxRateController } from './fx-rate.controller';
import { FxRateService } from './fx-rate.service';

@Module({
  controllers: [FxRateController],
  providers: [FxRateService],
  exports: [FxRateService],
})
export class FxRateModule {}
