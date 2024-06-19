import { NestFactory } from '@nestjs/core';
import { HankangBatchModule } from './hankang-batch.module';

async function bootstrap() {
  const app = await NestFactory.create(HankangBatchModule);
  await app.listen(3000);
}
bootstrap();
