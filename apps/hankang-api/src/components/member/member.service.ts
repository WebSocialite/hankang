import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Member, Members } from '../../libs/dto/member/member';
import { Direction, Message } from '../../libs/enums/common.enum';
import { LoginInput, MemberInput, MembersInquiry, SellersInquiry } from '../../libs/dto/member/member.input';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { AuthService } from '../auth/auth.service';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { StatisticModifier, T } from '../../libs/types/common';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { ViewInput } from '../../libs/dto/view/view.input';
import { lookupAuthMemberLiked } from '../../libs/config';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';
import { Follower, Following, MeFollowed } from '../../libs/dto/follow/follow';

@Injectable()
export class MemberService {
 constructor(
    @InjectModel('Member') private readonly memberModel: Model<Member>, 
    @InjectModel('Follow') private readonly followModel: Model<Follower | Following>, 
 private authService: AuthService,
 private viewService: ViewService,
 private likeService: LikeService,
) {}

public async signup(input: MemberInput): Promise<Member> {
      console.log("signup", input);
      input.memberPassword = await this.authService.hashPassword(input.memberPassword);
      console.log('Hashed password:', input.memberPassword);
    try {
     const result = await this.memberModel.create(input);
    result.accessToken = await this.authService.createToken(result);
     return result;
    } catch (err) {
     console.log('Error, Service.model:', err.message);
     throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
    }
   }
    
public async login(input: LoginInput): Promise<Member> {
    const { memberNick, memberPassword } = input;
    const response: Member = await this.memberModel
    .findOne({ memberNick: memberNick })
    .select('+memberPassword')
    .exec();
    console.log('Member found:', response);
      
    if (!response || response.memberStatus === MemberStatus.DELETE) { 
    throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
    } else if (response.memberStatus === MemberStatus.BLOCK) {
    throw new InternalServerErrorException(Message.BLOCKED_USER);
   }

    const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword);
    console.log('Password match:', isMatch);
    if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);
    response.accessToken = await this.authService.createToken(response);
    console.log('Access token created:', response.accessToken);
    return response;
  }
        
  public async updateMember(memberId: ObjectId, input: MemberUpdate): Promise<Member> {
    const result: Member = await this.memberModel.findOneAndUpdate({
        _id: memberId, 
        memberStatus: MemberStatus.ACTIVE,
    },
    input,
    { new: true },
    )
    .exec();
    console.log('Member updated:', result);
    if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    result.accessToken = await this.authService.createToken(result);
    return result;
 }
    
 public async getMember(memberId: ObjectId, targetId: ObjectId): Promise<Member> {
  console.log('GetMember memberId:', memberId, 'targetId:', targetId);
  const search: T = {
      _id: targetId,
      memberStatus: {
          $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
      },
  };
  const targetMember = await this.memberModel.findOne(search).lean().exec(); // .lean => javascriptni objectga aylantirib beradi
  if(!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
  
  if(memberId) {
    // record views
    const viewInput: ViewInput = { memberId: memberId, viewRefId: targetId, viewGroup: ViewGroup.MEMBER };
    const newView = await this.viewService.recordView(viewInput);
    
    //increase views
    if(newView) { // yangi view hosil bolganda pasdagi mantiqni qaytar dyapmiz
        await this.memberModel.findOneAndUpdate(search, { $inc: { memberViews: 1 }}, { new: true}).exec();
        targetMember.memberViews++;
    }

     //  me liked
        const likeInput = {memberId: memberId, likeRefId: targetId, likeGroup: LikeGroup.MEMBER};
        targetMember.meLiked = await this.likeService.checkLikeExistence(likeInput);
        console.log('Like checked:', targetMember.meLiked);
    
        targetMember.meFollowed = await this.checkSubscription(memberId, targetId);
     }
    return targetMember;
}

private async checkSubscription(followerId: ObjectId, followingId: ObjectId): Promise<MeFollowed[]> {
  const result = await this.followModel.findOne({followingId: followingId, followerId: followerId}).exec();
  return result ? [{followerId: followerId, followingId: followingId, myFollowing: true }] : [];
}


public async getSellers(memberId: ObjectId, input: SellersInquiry): Promise<Members> {
  const {text} = input.search;
  const match: T = { memberType: MemberType.SELLER, memberStatus: MemberStatus.ACTIVE };
  const sort: T = { [input?.sort ?? "createdAt"]: input?.direction ?? Direction.DESC }; // agar sort va direction kiritilmagan bolsa bu yerda CreatedAt boladi va DESC (yuqoridan pasga)

  if(text) match.memberNick = { $regex: new RegExp(text, 'i') }; 
  console.log("match", match);

  const result = await this.memberModel
  .aggregate([ // bu mantiq Pipeline lardan iborat va u Arrayni qabul qiladi
      { $match: match }, // match syntax
      { $sort: sort },
      { $facet: { // bir vaqtni ozida bir nechta pipeline dan foydalana olarkanmiz
          list: [{ $skip: (input.page -1) * input.limit}, { $limit: input.limit },  // list orniga istagan nom qoyishimiz mumkun
          lookupAuthMemberLiked(memberId),
          ],
          metaCounter: [{ $count: "total" }], // total nomi bilan count hosil qildik
       }, },

  ]).exec();
  if(!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
  console.log("member result:", result);
  
  return result[0];
 }

   //**             LIKE TARGET MEMBER                   **/

   public async likeTargetMember(memberId: ObjectId, likeRefId: ObjectId): Promise<Member> {
    const target: Member = await this.memberModel.findOne({_id: likeRefId, memberStatus: MemberStatus.ACTIVE}).exec();
    if(!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = { 
        memberId: memberId,
        likeRefId: likeRefId,
        likeGroup: LikeGroup.MEMBER
    };

    // LIKE TOGGLE via Like modules;   // toggle bizga like qoyilganda -1 qoyilmaganda +1 qlib beradi
    const modifier: number = await this.likeService.toggleLike(input);
    const result = await this.memberStatsEditor({_id:  likeRefId, targetKey: "memberLikes", modifier: modifier });

    if(!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
    return result;

   }
 /**         ADMIN only        **/

 public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
  const {memberStatus, memberType, text} = input.search;
  const match: T = {  };
  const sort: T = { [input?.sort ?? "createdAt"]: input?.direction ?? Direction.DESC };

  if(memberStatus) match.memberStatus = memberStatus;
  if(memberType) match.memberType = memberStatus;
  if(text) match.memberNick = { $regex: new RegExp(text, 'i') }; 
  console.log("match", match);

  const result = await this.memberModel
  .aggregate([
      { $match: match },
      { $sort: sort },
      { $facet: {
          list: [{ $skip: (input.page -1) * input.limit}, { $limit: input.limit }],
          metaCounter: [{ $count: "total" }],
       }, },

  ]).exec();
  if(!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
  return result[0];
}

public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
  const result: Member = await this.memberModel.findOneAndUpdate({_id: input._id}, input, { new: true }).exec();
  if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
  return result;
}

 

public async memberStatsEditor(input: StatisticModifier): Promise<Member> {
  const { _id, targetKey, modifier } = input;
  return await this.memberModel.findByIdAndUpdate(_id,
     { 
      $inc: { [targetKey]: modifier }
    },
     { 
      new: true })
      .exec();// statistikani ozgartiradigan logic yani Product add qlinsa +1 boladi
 }



    }

// import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, ObjectId } from 'mongoose';
// import { Member, Members } from '../../libs/dto/member/member';
// import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
// import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
// import { Direction, Message } from '../../libs/enums/common.enum';
// import { AuthService } from '../auth/auth.service';
// import { MemberUpdate } from '../../libs/dto/member/member.update';
// import { StatisticModifier, T } from '../../libs/types/common';
// import { ViewService } from '../view/view.service';
// import { ViewInput } from '../../libs/dto/member/view/view.input';
// import { ViewGroup } from '../../libs/enums/view.enum';
// import { LikeInput } from '../../libs/dto/like/like.input';
// import { LikeGroup } from '../../libs/enums/like.enum';
// import { LikeService } from '../like/like.service';
// import { Follower, Following, MeFollowed } from '../../libs/dto/follow/follow';
// import { lookupAuthMemberLiked } from '../../libs/config';

// @Injectable()
// export class MemberService {
//  constructor(
//     @InjectModel('Member') private readonly memberModel: Model<Member>, 
//     @InjectModel('Follow') private readonly followModel: Model<Follower | Following>, 
//  private authService: AuthService,
//  private viewService: ViewService,
//  private likeService: LikeService,
// ) {}

//  public async signup(input: MemberInput): Promise<Member> {
//     console.log("signup", input);
//     input.memberPassword = await this.authService.hashPassword(input.memberPassword);
//     console.log('Hashed password:', input.memberPassword);
//   try {
//    const result = await this.memberModel.create(input);
//     result.accessToken = await this.authService.createToken(result);
//    return result;
//   } catch (err) {
//    console.log('Error, Service.model:', err.message);
//    throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
//   }
//  }

//  public async login(input: LoginInput): Promise<Member> {
//   const { memberNick, memberPassword } = input;
//   const response: Member = await this.memberModel
//    .findOne({ memberNick: memberNick })
//    .select('+memberPassword')
//    .exec();
//    console.log('Member found:', response);

//   if (!response || response.memberStatus === MemberStatus.DELETE) {
//    throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
//   } else if (response.memberStatus === MemberStatus.BLOCK) {
//    throw new InternalServerErrorException(Message.BLOCKED_USER);
//   }

//   const isMatch = await this.authService.comparePasswords(input.memberPassword, response.memberPassword);
//   console.log('Password match:', isMatch);
//   if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);
//   response.accessToken = await this.authService.createToken(response);
//   console.log('Access token created:', response.accessToken);
//   return response;
//  }

//  public async updateMember(memberId: ObjectId, input: MemberUpdate): Promise<Member> {
//     const result: Member = await this.memberModel.findOneAndUpdate({
//         _id: memberId, 
//         memberStatus: MemberStatus.ACTIVE,
//     },
//     input,
//     { new: true },
//     )
//     .exec();
//     console.log('Member updated:', result);
//     if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

//     result.accessToken = await this.authService.createToken(result);
//     return result;
//  }

//  public async getMember(memberId: ObjectId, targetId: ObjectId): Promise<Member> {
//     console.log('GetMember memberId:', memberId, 'targetId:', targetId);
//     const search: T = {
//         _id: targetId,
//         memberStatus: {
//             $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
//         },
//     };
//     const targetMember = await this.memberModel.findOne(search).lean().exec();
//     if(!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

//     if(memberId) {
//         // record view
//         const viewInput: ViewInput = { memberId: memberId, viewRefId: targetId, viewGroup: ViewGroup.MEMBER };
//         const newView = await this.viewService.recordView(viewInput);
//         if(newView) {
//             await this.memberModel.findOneAndUpdate(search, { $inc: { memberViews: 1 }}, { new: true}).exec();
//             targetMember.memberViews++;
//         }
//     

//   return targetMember;
//  }

// 

//  public async getAgents(memberId: ObjectId, input: AgentsInquiry): Promise<Members> {
//     const {text} = input.search;
//     const match: T = { memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE };
//     const sort: T = { [input?.sort ?? "createdAt"]: input?.direction ?? Direction.DESC };

//     if(text) match.memberNick = { $regex: new RegExp(text, 'i') }; 
//     console.log("match", match);

//     const result = await this.memberModel
//     .aggregate([
//         { $match: match },
//         { $sort: sort },
//         { $facet: {
//             list: [{ $skip: (input.page -1) * input.limit}, { $limit: input.limit },
//             lookupAuthMemberLiked(memberId),
//             ],
//             metaCounter: [{ $count: "total" }],
//          }, },

//     ]).exec();
//     if(!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
//     return result[0];
//    }



 
//  public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
//     const {memberStatus, memberType, text} = input.search;
//     const match: T = {  };
//     const sort: T = { [input?.sort ?? "createdAt"]: input?.direction ?? Direction.DESC };

//     if(memberStatus) match.memberStatus = memberStatus;
//     if(memberType) match.memberType = memberStatus;
//     if(text) match.memberNick = { $regex: new RegExp(text, 'i') }; 
//     console.log("match", match);

//     const result = await this.memberModel
//     .aggregate([
//         { $match: match },
//         { $sort: sort },
//         { $facet: {
//             list: [{ $skip: (input.page -1) * input.limit}, { $limit: input.limit }],
//             metaCounter: [{ $count: "total" }],
//          }, },

//     ]).exec();
//     if(!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
//     return result[0];
// }
  
//    public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
//     const result: Member = await this.memberModel.findOneAndUpdate({_id: input._id}, input, { new: true }).exec();
//     if(!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
//     return result;
//    }

//    public async memberStatsEditor(input: StatisticModifier): Promise<Member> {
//     const { _id, targetKey, modifier } = input;
//     return await this.memberModel.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier }}, { new: true }).exec();
//    }

// }