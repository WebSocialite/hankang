import { BadRequestException, Injectable } from '@nestjs/common';
import { Model, ObjectId } from 'mongoose';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { InjectModel } from '@nestjs/mongoose';
import { LikeInput } from '../../libs/dto/like/like.input';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { OrdinaryInquiry } from '../../libs/dto/product/product.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { Products } from '../../libs/dto/product/product';
import { lookupFavorite } from '../../libs/config';

@Injectable()
export class LikeService {
    constructor(
        @InjectModel('Like') private readonly likeModel: Model<Like>, 
) {}
//**     this toggle logic adds one like and removes the like when pressed in the second time **/
    public async toggleLike(input: LikeInput): Promise<number> {
        const search: T = { memberId: input.memberId, likeRefId: input.likeRefId},
        exist = await this.likeModel.findOne(search).exec(); // like schema Modelni FindONE degan static methodini ishlatdik
        let modifier = 1;

        if(exist) {
            await this.likeModel.findOneAndDelete(search).exec();
            modifier = -1;
        } else {
            try {
                await this.likeModel.create(input);
            } catch(err) {
                console.log("Error, Service.model:", err.message);
                throw new BadRequestException(Message.CREATE_FAILED);
            }
        }
        console.log(`- Like modifier: ${modifier} - `);
        return modifier;
    }



    public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
        const { memberId, likeRefId } = input;
        const result = await this.likeModel.findOne({ memberId: memberId, likeRefId: likeRefId }).exec();
        return result ? [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }] : [];
    }



    public async getFavoriteProducts(memberId: ObjectId, input: OrdinaryInquiry): Promise<Products> {
        const { page, limit } = input;
        const match: T = { likeGroup: LikeGroup.PRODUCT, memberId: memberId};

        const data: T = await this.likeModel.aggregate([
            { $match: match}, 
            { $sort: { updatedAt: -1 } },  
            {
                $lookup: {  // topiberish logic
                    from: "products",  // products ga bosilgan log larni olib beradi
                    localField: "likeRefId",
                    foreignField: "_id",   // product collection da ID ga teng ni olib beradi
                    as: "favoriteProduct", // nomi shunaqa busin dyapmiz
                },
            },
            { $unwind: "$favoriteProduct" },  // qabul qilingan datani arrayda chiqarish logic
            {
                $facet: {
                    list: [
                        { $skip: (page - 1) * limit },  
                        { $limit: limit },
                        lookupFavorite,
                        { $unwind: "$favoriteProduct.memberData" },
                    ],
                    metaCounter: [{ $count: 'total' }],
                },
            },
         ])
        .exec();
        console.log("data:", data);
         const result: Products = { list: [], metaCounter: data[0].metaCounter};
         console.log(result);
         result.list = data[0].list.map((ele) => ele.favoriteProduct);
        return result;
    }
}
