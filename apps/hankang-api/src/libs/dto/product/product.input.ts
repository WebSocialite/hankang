import { Field, InputType, Int } from "@nestjs/graphql";
import { IsIn, IsNotEmpty, IsOptional, Length, Min } from "class-validator";
import { ProductStatus, ProductType } from "../../enums/product.enum";
import { ObjectId } from "mongoose";
import { availableOptions, availableProductSorts } from "../../config";
import { Direction } from "../../enums/common.enum";


@InputType()
export class ProductInput {
    @IsNotEmpty()
    @Field(() => ProductType)
    productType: ProductType;

    @IsNotEmpty()
    @Length(3, 100)
    @Field(() => String)
    productAddress: string;

    @IsNotEmpty()
    @Length(3, 100)
    @Field(() => String)
    productTitle: string;

    @IsNotEmpty()
    @Field(() => Number)
    productPrice: number;

    @IsNotEmpty()
    @Field(() => [String])
    productImages: string[];

    @IsOptional()
    @Length(5, 500)
    @Field(() => String, { nullable: true })
    productDesc?: string;

    memberId?: ObjectId;

    @IsOptional()
    @Field(() => Date, { nullable: true })
    constructedAt?: Date;

}

    @InputType()
    export class PricesRange {
    @Field(() => Int)
    start: number;

    @Field(() => Int)
    end: number;
}

    @InputType()
    export class SquaresRange {
    @Field(() => Int)
    start: number;

    @Field(() => Int)
    end: number;
}
    @InputType()
    export class PeriodsRange {
    @Field(() => Date)
    start: Date;

    @Field(() => Date)
    end: Date;    
}

    @InputType()
    class PISearch {
    @IsOptional()
    @Field(() => String, { nullable: true })
    memberId?: ObjectId;
    
    @IsOptional()
    @Field(() => [ProductType], { nullable: true })
    typeList?: ProductType[];

    @IsOptional()
    @IsIn(availableOptions, { each: true})
    @Field(() => [String], { nullable: true })
    options?: string[];

    @IsOptional()
    @Field(() => PricesRange, { nullable: true })
    pricesRange?: PricesRange;

    @IsOptional()
    @Field(() => String, { nullable: true })
    text?: string;
}


    @InputType()
   
    export class ProductsInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availableProductSorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => PISearch)
    search: PISearch;

}

    @InputType()
    class APISearch {
    @IsOptional()
    @Field(() => ProductStatus, { nullable: true })
    productStatus?: ProductStatus;
}

    @InputType()
    export class SellerProductsInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availableProductSorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => APISearch)
    search: APISearch;
}

 @InputType()
    class ALPISearch {
    @IsOptional() 
    @Field(() => ProductStatus, { nullable: true })  //SOLD/ACTIVE/DELETE hammasini ADMIN koraoladigan qildik
    productStatus?: ProductStatus;
}

    @InputType()
    export class AllProductsInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availableProductSorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => ALPISearch)
    search: ALPISearch;
}

    @InputType()
    export class OrdinaryInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;
    }