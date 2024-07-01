import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ProductService } from './product.service';
//import { Products, Product } from '../../libs/dto/product/product';
//import { SellerProductsInquiry, AllProductsInquiry, OrdinaryInquiry, ProductsInquiry, ProductInput } from '../../libs/dto/product/product.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
//import { ProductUpdate } from '../../libs/dto/product/product.update';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Product } from '../../libs/dto/product/product';
import { ProductInput } from '../../libs/dto/product/product.input';

@Resolver()
export class ProductResolver {
    constructor(private readonly productService: ProductService) {}

    @Roles(MemberType.SELLER)
    @UseGuards(RolesGuard)
    @Mutation(() => Product)
    public async createProduct(
        @Args('input') input: ProductInput, 
        @AuthMember("_id") memberId: ObjectId
    ): Promise<Product> {
        console.log("Mutation: createProduct");
        input.memberId = memberId; // lyuboy member birovni nomidan request qilolmasligi uchun
        return await this.productService.createProduct(input);
    }


}