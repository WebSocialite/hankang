import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MemberService } from '../member/member.service';
import { Message } from '../../libs/enums/common.enum';
import { ProductInput } from '../../libs/dto/product/product.input';
import { Product } from '../../libs/dto/product/product';
import { Model, ObjectId } from 'mongoose';
import { StatisticModifier, T } from '../../libs/types/common';
import { ProductStatus } from '../../libs/enums/product.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { LikeGroup } from '../../libs/enums/like.enum';


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

public async productStatsEditor( input: StatisticModifier): Promise<Product> {
    const { _id, targetKey, modifier } = input;
    return await this.productModel.findByIdAndUpdate(
        _id,
        {$inc: { [targetKey]: modifier } },
        { new: true, },
    ).exec();
}




}