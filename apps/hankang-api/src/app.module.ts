import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver } from "@nestjs/apollo";
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
// import { ComponentsModule } from './components/components.module';
// import { DatabaseModule } from './database/database.module';
// import { T } from './libs/types/common';
// import { SocketModule } from './socket/socket.module';

@Module({ //GRAPH QL API BACKEND SERVERINI TASHKIL QILYAPMIZ!!!!!
  imports: [
    ConfigModule.forRoot(), // envorimental variablelarni oqish imkoniyatinin beradi
    GraphQLModule.forRoot({ // graphQL ni yasavolayapmiz
      driver: ApolloDriver,
      playground: true,
      uploads: false,
      autoSchemaFile: true,
      // formatError: (error: ) => {
      //   const graphQLFormattedError = {
      //     code: error?.extensions.code,
      //     message: error?.extensions?.exception?.response?.message || error?.extensions?.response?.message || error?.message, 
      //   };
      //   console.log("GRAPHQL GLOBAL ERR", graphQLFormattedError);
      //   return graphQLFormattedError;
      // },
    }),
    ComponentsModule,  // App modulemiz shu components module dan iborat boladi
    DatabaseModule,
    
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}