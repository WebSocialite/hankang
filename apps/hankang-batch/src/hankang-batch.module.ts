import { Module } from '@nestjs/common';
import { HankangBatchController } from './hankang-batch.controller';
import { HankangBatchService } from './hankang-batch.service';
import { ConfigModule} from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [HankangBatchController],
  providers: [HankangBatchService],
})
export class HankangBatchModule {}
