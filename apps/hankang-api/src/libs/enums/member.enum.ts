import { registerEnumType } from "@nestjs/graphql";

export enum MemberType {
    USER = "USER",
    SELLER = "SELLER",
    ADMIN = "ADMIN",
}
registerEnumType(MemberType, { // hosil qilgan enumimizni hardoim royhatga olishimiz shart 
    name: "MemberType",
});

export enum MemberStatus { 
    ACTIVE = "ACTIVE",
    DELETE = "DELETE",//database dan delete qilmasdan shunchaki statusni ozgartirsa buladi
    BLOCK = "BLOCK",
}
registerEnumType(MemberStatus, { 
    name: "MemberStatus",
});

export enum MemberAuthType {
    PHONE = "PHONE",
    EMAIL = "EMAIL",
    TELEGRAM = "TELEGRAM",
}
registerEnumType(MemberAuthType, { 
    name: "MemberAuthType",
});