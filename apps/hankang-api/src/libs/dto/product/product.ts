import { Field, Int, ObjectType } from "@nestjs/graphql";
import { ObjectId } from "mongoose";
import { ProductStatus, ProductType } from "../../enums/product.enum";
import { Member, TotalCounter } from "../member/member";
//import { MeLiked } from "../like/like";



@ObjectType() //from backend to client it helps to create types
export class Product {
    @Field(() => String)
    _id: ObjectId;

    @Field(() => ProductType)
    productType: ProductType;

    @Field(() => ProductStatus)
    productStatus: ProductStatus;
    
    @Field(() => String)
    productAddress: string;

    @Field(() => String)
    productTitle: string;

    @Field(() => Number)
    productPrice: number;

    @Field(() => Int)
    productViews: number;

    @Field(() => Int)
    productLikes: number;

    @Field(() => Int)
    productComments: number;

    @Field(() => Int)
    productRank: number;

    @Field(() => [String])
    productImages: string[];

    @Field(() => String, { nullable: true })
    productDesc?: string; 
    
    @Field(() => String)
    memberId: ObjectId;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date, { nullable: true })
    soldAt?: Date;

    @Field(() => Date, { nullable: true })
    deletedAt?: Date;

    @Field(() => Date, { nullable: true })
    constructedAt?: Date;

    @Field(() => Date)
    updatedAt: Date;

    /** FROM AGGREGATION **/

   // @Field(() => [MeLiked], { nullable: true})
   // meLiked?: MeLiked[];

    @Field(() => Member, { nullable : true})
    memberData?: Member;
}

@ObjectType()
export class Products {
    @Field(() => [Product])
    list: Product[];

    @Field(() => [TotalCounter], { nullable: true })
    metaCounter: TotalCounter[];
}
