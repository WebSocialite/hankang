import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());   // user o'zini datasini tugri kiritgan yoki yoq ligini validate qlib beradi  
  app.useGlobalInterceptors(new LoggingInterceptor()); // middleware integrations 
  await app.listen(process.env.PORT_API ?? 4000);
}
bootstrap();
