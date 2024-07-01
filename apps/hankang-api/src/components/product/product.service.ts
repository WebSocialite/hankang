import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MemberService } from '../member/member.service';
import { Message } from '../../libs/enums/common.enum';
import { ProductInput } from '../../libs/dto/product/product.input';
import { Product } from '../../libs/dto/product/product';
import { Model } from 'mongoose';


@Injectable()
export class ProductService {
    
    constructor(
        @InjectModel('Product') private readonly productModel: Model<Product>, 
    private memberService: MemberService, // module da import qilganmmiz
    //private viewService: ViewService,
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


}