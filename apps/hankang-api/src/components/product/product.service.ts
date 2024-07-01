import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MemberService } from '../member/member.service';
import { Direction, Message } from '../../libs/enums/common.enum';
import { ProductInput, ProductsInquiry } from '../../libs/dto/product/product.input';
import { Product, Products } from '../../libs/dto/product/product';
import { Model, ObjectId } from 'mongoose';
import { StatisticModifier, T } from '../../libs/types/common';
import { ProductStatus } from '../../libs/enums/product.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { LikeGroup } from '../../libs/enums/like.enum';
import { ProductUpdate } from '../../libs/dto/product/product.update';
import moment from 'moment';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';


@Injectable()
export class ProductService {
    
    constructor(
        @InjectModel('Product') private readonly productModel: Model<Product>, 
    private memberService: MemberService, // module da import qilganmmiz
    private viewService: ViewService,
    //private likeService: LikeService,
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
    //const likeInput = {memberId: memberId, likeRefId: productId, likeGroup: LikeGroup.PRODUCT};
    //targetProduct.meLiked = await this.likeService.checkLikeExistence(likeInput);
 
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
        options,
        typeList,
        text,
    } = input.search;
    if(memberId) match.memberId = shapeIntoMongoObjectId(memberId);
    if(typeList && typeList.length) match.productType = { $in: typeList };

    if(pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end }; // gte = greater than or equal

    if(text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
    if(options) { 
        match['$or'] = options.map((ele) => {
            return { [ele]: true }; 
        }) ;
    }
}



public async productStatsEditor( input: StatisticModifier): Promise<Product> {
    const { _id, targetKey, modifier } = input;
    return await this.productModel.findByIdAndUpdate(
        _id,
        {$inc: { [targetKey]: modifier } },
        { new: true, },
    ).exec();
}




}