import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());   // user o'zini datasini tugri kiritgan yoki yoq ligini validate qlib beradi  
  await app.listen(process.env.PORT_API ?? 4000);
}
bootstrap();
