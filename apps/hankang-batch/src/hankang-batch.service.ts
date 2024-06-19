import { Injectable } from '@nestjs/common';

@Injectable()
export class HankangBatchService {
  getHello(): string {
    return 'WELCOME TO HANKANG BATCH SERVER!';
  }
}
