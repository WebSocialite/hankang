import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';

// we can build Auth process in 3 types: 
// Sessions, Token(cookies) Token(Headers) 
// Cookies eng havsiz hisoblanadi 
// Browser: { local, cache , cookie } storages
// Cookies live only in Browser and they cant be in Mobile Apps


@Module({
    imports: [
        HttpModule,
        JwtModule.register({
            secret: `${process.env.SECRET_TOKEN}`,
            signOptions: {expiresIn: '30 days'}, 
        }),
    ],
    providers: [AuthService],
    exports: [AuthService],

})
export class AuthModule {}
