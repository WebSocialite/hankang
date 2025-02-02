import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SellersInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { WithoutGuard } from '../auth/guards/without.guard';
import { getSerialForImage, shapeIntoMongoObjectId, validMimeTypes } from '../../libs/config';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { createWriteStream } from 'fs';
import { Message } from '../../libs/enums/common.enum';

@Resolver()
export class MemberResolver {
    constructor( private readonly memberService: MemberService) {}

    
    @Mutation(() => Member)
    public async signup(@Args('input') input: MemberInput): Promise<Member> {
    console.log("Mutation: signup");
    console.log("input", input);
    return await this.memberService.signup(input);
}
        
    @Mutation(() => Member)
    public async login(@Args('input') input: LoginInput): Promise<Member> {
    console.log("Mutation: login");
    return await this.memberService.login(input);
    }

    @UseGuards(AuthGuard) // buyerga qoyishdan maqsad, aynan kim request qilayotganini bilib keyin response berish
    @Query(() => String)
    public async checkAuth(@AuthMember("memberNick") memberNick: string ): Promise<string> { // @AuthMember = Custom decorator
        console.log("Query: checkAuth");
        console.log("memberNick", memberNick);
        return `Hi ${memberNick}`;
    }

    @Roles(MemberType.USER, MemberType.SELLER)
    @UseGuards(RolesGuard) 
    @Query(() => String)
    public async checkAuthRoles(@AuthMember() authMember: Member ): Promise<string> { // @AuthMember = Custom decorator
        console.log("Query: checkAuthRoles");
        return `Hi ${authMember.memberNick}, you are ${authMember.memberType}(memberId: ${authMember._id})`;
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Member)
    public async updateMember(
        @Args("input") input: MemberUpdate,
        @AuthMember("_id") memberId: ObjectId 
    ): Promise<Member> { // @AuthMember = Custom decorator
    console.log("Mutation: updateMember");  // _id ni olib ber deb request qildik
    return await this.memberService.updateMember(memberId, input);
    }


    @UseGuards(WithoutGuard)
    @Query(() => Member)
    public async getMember(
        @Args("memberId") input: string, 
        @AuthMember('_id') memberId: ObjectId): Promise<Member> {
        console.log("Query: getMember");
        const targetId = shapeIntoMongoObjectId(input);
        return await this.memberService.getMember(memberId, targetId);
    }

    
    @UseGuards(WithoutGuard)
    @Query(() => Members)
    public async getSellers(
    @Args("input") input: SellersInquiry, 
    @AuthMember('_id') memberId: ObjectId): Promise<Members> {
        console.log("Query: getSellers");
        return await this.memberService.getSellers(memberId, input);
    }


        //**                    Like logic               */

    @UseGuards(AuthGuard) 
    @Mutation(() => Member)
     public async likeTargetMember
     (@Args("memberId") input: string,
      @AuthMember('_id') memberId: ObjectId
    ): Promise<Member> {
        console.log("Query: likeTargetMember");
        const likeRefId = shapeIntoMongoObjectId(input);
        return await this.memberService.likeTargetMember(memberId, likeRefId);
    }

   //**  ADMIN ONLY  **/

   @Roles(MemberType.ADMIN)   // faqat adminlar foydalanaoladigan logic
   @UseGuards(RolesGuard)
   @Query(() => Members)
   public async getAllMembersByAdmin(
       @Args('input') input: MembersInquiry): Promise<Members> {
       console.log("Query: getAllMembersByAdmin");
       return await this.memberService.getAllMembersByAdmin(input);
   }

   @Roles(MemberType.ADMIN)
   @UseGuards(RolesGuard)
   @Mutation(() => Member)
   public async updateMemberByAdmin(@Args('input') input: MemberUpdate ): Promise<Member> {
       console.log('Mutation: updateMemberByAdmin');
       return await this.memberService.updateMemberByAdmin(input);
   }



/**   UPLOADER    **/
@UseGuards(AuthGuard)
@Mutation((returns) => String)
public async imageUploader(
	@Args({ name: 'file', type: () => GraphQLUpload })
{ createReadStream, filename, mimetype }: FileUpload,
@Args('target') target: String, // argumenti Target
): Promise<string> {
	console.log('Mutation: imageUploader');

	if (!filename) throw new Error(Message.UPLOAD_FAILED);
const validMime = validMimeTypes.includes(mimetype);  // biz serverga faqat JPG PNG JPEG file larni yuklashini permit qlamiz
if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

const imageName = getSerialForImage(filename);
const url = `uploads/${target}/${imageName}`; // uploads folder ning target nomli folderiga save qlishni buyurayapmiz
const stream = createReadStream();

const result = await new Promise((resolve, reject) => {
	stream
		.pipe(createWriteStream(url))
		.on('finish', async () => resolve(true))
		.on('error', () => reject(false));
});
if (!result) throw new Error(Message.UPLOAD_FAILED);

return url;
}

@UseGuards(AuthGuard)
@Mutation((returns) => [String])
public async imagesUploader(
	@Args('files', { type: () => [GraphQLUpload] })
files: Promise<FileUpload>[],
@Args('target') target: String,
): Promise<string[]> {
	console.log('Mutation: imagesUploader');

	const uploadedImages = [];
	const promisedList = files.map(async (img: Promise<FileUpload>, index: number): Promise<Promise<void>> => {
		try {
			const { filename, mimetype, encoding, createReadStream } = await img;

			const validMime = validMimeTypes.includes(mimetype);
			if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

			const imageName = getSerialForImage(filename);
			const url = `uploads/${target}/${imageName}`;
			const stream = createReadStream();

			const result = await new Promise((resolve, reject) => {
				stream
					.pipe(createWriteStream(url))
					.on('finish', () => resolve(true))
					.on('error', () => reject(false));
			});
			if (!result) throw new Error(Message.UPLOAD_FAILED);

			uploadedImages[index] = url;
		} catch (err) {
			console.log('Error, file missing!');
		}
	});

	await Promise.all(promisedList);
	return uploadedImages;
}




   
}




// import { Mutation, Resolver, Query, Args } from '@nestjs/graphql';
// import { MemberService } from './member.service';
// import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
// import { Member, Members } from '../../libs/dto/member/member';
// import { UseGuards } from '@nestjs/common';
// import { AuthGuard } from '../auth/guards/auth.guard';
// import { AuthMember } from '../auth/decorators/authMember.decorator';
// import { ObjectId } from 'mongoose';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { MemberType } from '../../libs/enums/member.enum';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { MemberUpdate } from '../../libs/dto/member/member.update';
// import { getSerialForImage, shapeIntoMongoObjectId, validMimeTypes } from '../../libs/config';
// import { WithoutGuard } from '../auth/guards/without.guard';
// import { GraphQLUpload, FileUpload } from 'graphql-upload';
// import { createWriteStream } from 'fs';
// import { Message } from '../../libs/enums/common.enum';

// @Resolver()
// export class MemberResolver {
//     constructor(private readonly memberService: MemberService) {}

//     @Mutation(() => Member)
//     public async signup(@Args('input') input: MemberInput): Promise<Member> {
//             console.log("Mutation: signup");
//             console.log("input", input);
//             return await this.memberService.signup(input);
//     }
    
//     @Mutation(() => Member)
//     public async login(@Args("input") input: LoginInput): Promise<Member> {
//             console.log("Mutation: login");
//             return await this.memberService.login(input);
//     }

//     @UseGuards(AuthGuard) // buyerga qoyishdan maqsad, aynan kim request qilayotganini bilib keyin response berish
//     @Query(() => String)
//     public async checkAuth(@AuthMember("memberNick") memberNick: string ): Promise<string> { // @AuthMember = Custom decorator
//         console.log("Query: checkAuth");
//         console.log("memberNick", memberNick);
//         return `Hi ${memberNick}`;
//     }

//     @Roles(MemberType.USER, MemberType.AGENT)
//     @UseGuards(RolesGuard) 
//     @Query(() => String)
//     public async checkAuthRoles(@AuthMember() authMember: Member ): Promise<string> { // @AuthMember = Custom decorator
//         console.log("Query: checkAuthRoles");
//         return `Hi ${authMember.memberNick}, you are ${authMember.memberType}(memberId: ${authMember._id})`;
//     }

//     // Authenticated user agent admin can update
//     @UseGuards(AuthGuard) 
//     @Mutation(() => Member)
//     public async updateMember(
//         @Args("input") input: MemberUpdate,
//         @AuthMember("_id") memberId: ObjectId 
//     ): Promise<Member> { // @AuthMember = Custom decorator
//         console.log("Mutation: updateMember");
//         delete input._id;
//         return await this.memberService.updateMember(memberId, input);
//     }


//     @UseGuards(WithoutGuard)
//     @Query(() => Member)
//     public async getMember(
//         @Args("memberId") input: string, 
//         @AuthMember('_id') memberId: ObjectId): Promise<Member> {
//         console.log("Query: getMember");
//         const targetId = shapeIntoMongoObjectId(input);
//         return await this.memberService.getMember(memberId, targetId);
//     }

//     @UseGuards(WithoutGuard)
//     @Query(() => Members)
//     public async getAgents(@Args("input") input: AgentsInquiry, @AuthMember('_id') memberId: ObjectId): Promise<Members> {
//         console.log("Query: getMember");
//         return await this.memberService.getAgents(memberId, input);

//     }



//                                     /**  ADMIN  **/

//     // Authorization: ADMIN 
// @Roles(MemberType.ADMIN)   // faqat adminlar foydalanaoladigan logic
// @UseGuards(RolesGuard)
// @Query(() => Members)
// public async getAllMembersByAdmin(
//     @Args('input') input: MembersInquiry): Promise<Members> {
//     console.log("Query: getAllMembersByAdmin");
//     return await this.memberService.getAllMembersByAdmin(input);
// }


// // Authorization: ADMIN
// @Roles(MemberType.ADMIN)
// @UseGuards(RolesGuard)
// @Mutation(() => Member)
// public async updateMemberByAdmin(@Args('input') input: MemberUpdate ): Promise<Member> {
//     console.log('Mutation: updateMemberByAdmin');
//     return await this.memberService.updateMemberByAdmin(input);
// }




// }