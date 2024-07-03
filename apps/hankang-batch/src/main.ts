import { NestFactory } from '@nestjs/core';
import { HankangBatchModule } from './batch.module';

async function bootstrap() {
  const app = await NestFactory.create(HankangBatchModule);
  await app.listen(process.env.PORT_BATCH ?? 4000);
}
bootstrap();
