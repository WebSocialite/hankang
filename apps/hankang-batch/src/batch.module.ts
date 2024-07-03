import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import MemberSchema from 'apps/hankang-api/src/schemas/Member.model';
import { MongooseModule } from '@nestjs/mongoose';
import ProductSchema from 'apps/hankang-api/src/schemas/Product.model';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule, 
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: 'Product', schema: ProductSchema }]),
    MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),

  ],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
