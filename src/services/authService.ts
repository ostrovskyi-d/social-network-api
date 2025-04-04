// @ts-ignore
import {getConfig} from '../config';
import UserController from '../controllers/UserController/UserController'
import {verify} from "jsonwebtoken";
import {expressjwt} from "express-jwt";
import log from "../heplers/logger";

const config = getConfig();
const {AUTH} = config;
const User = new UserController();

// const isRevoked = async (req: any, payload: any, done: any) => {
//     const user = await User.getById(payload.sub);
//
//     // revoke token if user no longer exists
//     if (!user) {
//         return done(null, true);
//     }
//
//     done();
// };

const jwt = () => {
    return expressjwt({
            secret: AUTH.JWT_SECRET,
            algorithms: ['HS256'],
            // isRevoked,
        }
    ).unless({
        // public routes that don't require authentication
        path: AUTH.NO_AUTH_PATHS
    });
};

export const getUserIdByToken = async (token: string | undefined) => {
    const parsedToken: string | undefined = token?.toString().includes('Bearer') ? token.split('Bearer ')[1] : token;
    if (parsedToken) {
        const verifyResult = verify(parsedToken, AUTH.JWT_SECRET as string);

        return verifyResult;
    }
}

export default jwt;
