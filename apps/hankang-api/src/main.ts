import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from "graphql-upload";
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());   // user o'zini datasini tugri kiritgan yoki yoq ligini validate qlib beradi  
  app.useGlobalInterceptors(new LoggingInterceptor()); // middleware integrations 
  app.enableCors({ origin: true, credentials: true });  // giving permission for domain file upload requests
  
  app.use(graphqlUploadExpress({maxFileSize: 1500000, maxFiles: 10})); // putting limit on size as well as on quantity of files to be uploaded
  app.use("/upload", express.static('./upload'));  // openning up our upload folder to outside requests
  
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(process.env.PORT_API ?? 4000);
}
bootstrap();
