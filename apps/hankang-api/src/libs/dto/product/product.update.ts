import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsOptional, Length } from "class-validator";
import { ProductStatus, ProductType } from "../../enums/product.enum";
import { ObjectId } from "mongoose";


@InputType()
export class ProductUpdate {
    @IsNotEmpty()
    @Field(() => String)
    _id: ObjectId;

    @IsOptional()
    @Field(() => ProductType, { nullable: true })
    productType?: ProductType;

    @IsOptional()
    @Field(() => ProductStatus, { nullable: true })
    productStatus?: ProductStatus;

    @IsOptional()
    @Length(3, 100)
    @Field(() => String, { nullable: true })
    productAddress?: string;

    @IsOptional()
    @Length(3, 100)
    @Field(() => String, { nullable: true })
    productTitle?: string;

    @IsOptional()
    @Field(() => Number, { nullable: true })
    productPrice?: number;

    @IsOptional()
    @Field(() => [String], { nullable: true })
    productImages?: string[];

    @IsOptional()
    @Length(5, 500)
    @Field(() => String, { nullable: true })
    productDesc?: string;

    soldAt?: Date;      // frontEnd dan kelmagani uchun @FIELD ni biriktirmadik 

    deletedAt?: Date;

    @IsOptional()
    @Field(() => Date, { nullable: true })
    constructedAt?: Date;

}