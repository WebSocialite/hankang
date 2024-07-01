import { Module } from '@nestjs/common';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';
import { MongooseModule } from '@nestjs/mongoose';
import ProductSchema from '../../schemas/Product.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { MemberModule } from '../member/member.module';
import { LikeModule } from '../like/like.module';

@Module({
  imports: 
  [MongooseModule.forFeature([{ // mongooseModule bizning DATABASE ga connection qilganmiz
      name: 'Product', 
      schema: ProductSchema
    },
  ]),
   AuthModule, // bu module orqali biz USEGUARDS larni chaqirayapmiz
   ViewModule, // bu module orqali biz View larimiz oshishi logic ni chaqirdik
   MemberModule, // import qildik service da ishlatish uchun
   LikeModule,
  ],

providers: [ProductResolver, ProductService],
  exports: [ProductService]
})
export class ProductModule {}