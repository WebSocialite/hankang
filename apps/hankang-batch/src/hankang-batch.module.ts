import { Module } from '@nestjs/common';
import { HankangBatchController } from './hankang-batch.controller';
import { HankangBatchService } from './hankang-batch.service';

@Module({
  imports: [],
  controllers: [HankangBatchController],
  providers: [HankangBatchService],
})
export class HankangBatchModule {}
