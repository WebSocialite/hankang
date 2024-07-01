import { ObjectId } from "mongoose";

export interface T {
    [key: string]: any;
}


export interface StatisticModifier { //collection ni ihtiyoriy data collection ozgartirish uchun hizmat qiladi
    _id: ObjectId;  // mongoose type
    targetKey: string;  // nomini ozgartish 
    modifier: number;  // qiymatini ozgartirish
}