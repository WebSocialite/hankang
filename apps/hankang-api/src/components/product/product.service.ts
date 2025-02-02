import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MemberService } from '../member/member.service';
import { Direction, Message } from '../../libs/enums/common.enum';
import { AllProductsInquiry, OrdinaryInquiry, ProductInput, ProductsInquiry, SellerProductsInquiry } from '../../libs/dto/product/product.input';
import { Product, Products } from '../../libs/dto/product/product';
import { Model, ObjectId } from 'mongoose';
import { StatisticModifier, T } from '../../libs/types/common';
import { ProductStatus } from '../../libs/enums/product.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { ProductUpdate } from '../../libs/dto/product/product.update';
import * as moment from 'moment';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';


@Injectable()
export class ProductService {
    
    constructor(
        @InjectModel('Product') private readonly productModel: Model<Product>, 
    private memberService: MemberService, // module da import qilganmmiz
    private viewService: ViewService,
    private likeService: LikeService,
) {}

public async createProduct(input: ProductInput): Promise<Product> {
    try {
        const result = await this.productModel.create(input); // create statis method
        // increase memberProperties +1
        await this.memberService.memberStatsEditor({ 
             _id: result.memberId, 
             targetKey: 'memberProducts', 
             modifier: 1,
         })
        return result;
    } catch (err) {
        console.log("Error, Service.model:", err.message);
        throw new BadRequestException(Message.CREATE_FAILED);
    }
}

public async getProduct(memberId: ObjectId, productId: ObjectId): Promise<Product> {
    const search: T = {
        _id: productId,
        productStatus: ProductStatus.ACTIVE,
    };
    const targetProduct: Product = await this.productModel.findOne(search).lean().exec();
    if (!targetProduct) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    if (memberId) { // agar member Authenticated bulsa = memberId mavjud bolsa
        const viewInput = { memberId: memberId, viewRefId: productId, viewGroup: ViewGroup.PRODUCT }; // tomosha qilingan product ni record qladigan mantiq
        const newView = await this.viewService.recordView(viewInput);
    
    if (newView) {
       await this.productStatsEditor({ _id: productId, targetKey: 'productViews', modifier: 1 });
        targetProduct.productViews++;    // statisika sini yangilaydigan mantiq  
    }
}
    targetProduct.memberData = await this.memberService.getMember(null, targetProduct.memberId);  // product.ts dan memberdatani olibkeldik
    //me liked
    const likeInput = {memberId: memberId, likeRefId: productId, likeGroup: LikeGroup.PRODUCT};
    targetProduct.meLiked = await this.likeService.checkLikeExistence(likeInput);
 
    return targetProduct;
}

public async updateProduct (memberId: ObjectId, input: ProductUpdate): Promise<Product> {
    let { productStatus, soldAt, deletedAt } = input;
    const search: T = {
        _id: input._id,
        memberId: memberId,  // memId beryapmiz sababi faqat ozini producti bolsa update qilaolishligi uchun
        productStatus: ProductStatus.ACTIVE,
    };
if (productStatus === ProductStatus.SOLD) soldAt = moment().toDate(); // SOLD bolgan vaqtni royhatga ovolayapmiz
else if (productStatus === ProductStatus.DELETE) deletedAt = moment().toDate(); // DELETE bolgan vaqtni royhatga olyapmiz

const result = await this.productModel.findOneAndUpdate(search, input, {
    new: true,
})
.exec();
if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

if(soldAt || deletedAt) { // agar sold/ yoki deleted bolsa statistikasini -1 qil degan logic
    await this.memberService.memberStatsEditor({
        _id: memberId,
        targetKey: 'memberProducts',
        modifier: -1,
    });
}
return result;
}

public async getProducts (memberId: ObjectId, input: ProductsInquiry): Promise<Products> {
    const match: T = { productStatus: ProductStatus.ACTIVE };
    const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    this.shapeMatchQuery(match, input);
    console.log('match:', match);

    const result = await this.productModel
    .aggregate([
        { $match: match },
        { $sort: sort },
        {
            $facet: {
                list: [
                    { $skip: ( input.page - 1) * input.limit },
                    { $limit: input.limit },
                    // me Liked
                    lookupAuthMemberLiked(memberId),
                    lookupMember,
                    { $unwind: '$memberData'}, // unwind arrayni ichidagi datani olib beradi Arrayni esa tashlavoradi
                ],
                metaCounter: [{ $count: 'total'}],
            },
        },
    ])
    .exec();
    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    console.log("RESULT", result[0]);
    return result[0];
}
private shapeMatchQuery (match: T, input: ProductsInquiry): void {
    const {
        memberId,
        pricesRange,
        typeList,
        text,
    } = input.search;
    if(memberId) match.memberId = shapeIntoMongoObjectId(memberId);
    if(typeList && typeList.length) match.productType = { $in: typeList };
    if(pricesRange) match.productPrice = { $gte: pricesRange.start, $lte: pricesRange.end }; // gte = greater than or equal
    if(text) match.productTitle = { $regex: new RegExp(text, 'i') };
}

public async getFavorites(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
    return await this.likeService.getFavoriteProducts(memberId, input);
}

public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
    return await this.viewService.getVisitedProducts(memberId, input);
}


public async getSellerProducts(memberId: ObjectId, input: SellerProductsInquiry): Promise<Products> {
    const { productStatus } = input.search;
    if (productStatus === ProductStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

    const match: T = {memberId: memberId,
        productStatus: productStatus ?? { $ne: ProductStatus.DELETE },
    };

    const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    const result = await this.productModel
    .aggregate([
        { $match: match },
        { $sort: sort },
        {
            $facet: {
                list:[
                    { $skip: (input.page - 1) * input.limit },
                    { $limit: input.limit },
                    lookupMember,
                    { $unwind: '$memberData' },
                ],
                metaCounter: [{ $count: 'total' }],
            },
        },
    ])
    .exec();
    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
}

 //**             LIKE TARGET MEMBER                   **/

 public async likeTargetProduct(memberId: ObjectId, likeRefId: ObjectId): Promise<Product> {
    const target: Product = await this.productModel.findOne({_id: likeRefId, productStatus: ProductStatus.ACTIVE}).exec();
    if(!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = { 
        memberId: memberId,
        likeRefId: likeRefId,
        likeGroup: LikeGroup.PRODUCT,
    };

    // LIKE TOGGLE via Like modules;   // toggle bizga like qoyilganda -1 qoyilmaganda +1 qlib beradi
    const modifier: number = await this.likeService.toggleLike(input);
    const result = await this.productStatsEditor({_id:  likeRefId, targetKey: "productLikes", modifier: modifier });

    if(!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
    return result;

   }

public async productStatsEditor( input: StatisticModifier): Promise<Product> {
    const { _id, targetKey, modifier } = input;
    return await this.productModel.findByIdAndUpdate(
        _id,
        {$inc: { [targetKey]: modifier } },
        { new: true, },
    ).exec();
}






//**                        ADMIN LOGIC                  */
public async getAllProductsByAdmin (input: AllProductsInquiry): Promise<Products> {
    const { productStatus } = input.search;
    const match: T = { };
    const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    if(productStatus) match.productStatus = productStatus;

    const result = await this.productModel
    .aggregate([
        { $match: match },
        { $sort: sort },
        {
            $facet: {
                list: [
                    { $skip: ( input.page - 1) * input.limit },
                    { $limit: input.limit },
                    // me Liked 
                    lookupMember,
                    { $unwind: '$memberData'}, // unwind arrayni ichidagi datani olib beradi Arrayni esa tashlavoradi
                ],
                metaCounter: [{ $count: 'total'}],
            },
        },
    ])
    .exec();
    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
}

public async updateProductByAdmin (input: ProductUpdate): Promise<Product> {
    let { productStatus, soldAt, deletedAt } = input;
    const search: T = {
        _id: input._id,
        productStatus: ProductStatus.ACTIVE,
    };
if (productStatus === ProductStatus.SOLD) soldAt = moment().toDate();
else if (productStatus === ProductStatus.DELETE) deletedAt = moment().toDate();

const result = await this.productModel.findOneAndUpdate(search, input, {
    new: true,
})
.exec();
if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

if(soldAt || deletedAt) {
    await this.memberService.memberStatsEditor({
        _id: result.memberId,
        targetKey: 'memberProducts',
        modifier: -1,
    });
}
return result;
}

public async removeProductByAdmin (productId: ObjectId): Promise<Product> {
    const search: T = { _id: productId, productStatus: ProductStatus.DELETE }; //faqat deleted bulgan holdagina remove qilsa buladi, yani active yoki sold bulsa remove qilib bolmaydi
    const result = await this.productModel.findOneAndDelete(search).exec();
    if(!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

    return result;
}


}