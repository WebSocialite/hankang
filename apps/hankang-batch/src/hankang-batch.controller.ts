import { Controller, Get } from '@nestjs/common';
import { HankangBatchService } from './hankang-batch.service';

@Controller()
export class HankangBatchController {
  constructor(private readonly hankangBatchService: HankangBatchService) {}

  @Get()
  getHello(): string {
    return this.hankangBatchService.getHello();
  }
}
