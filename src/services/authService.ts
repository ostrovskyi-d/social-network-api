// @ts-ignore
import expressJwt from 'express-jwt';
import {getConfig} from '../config';
import UserController from '../controllers/UserController/UserController'
import {verify} from "jsonwebtoken";
const config = getConfig();
const {AUTH} = config;
const User = new UserController();

const isRevoked = async (req: any, payload: any, done: any) => {
    const user = await User.getById(payload.sub);

    // revoke token if user no longer exists
    if (!user) {
        return done(null, true);
    }

    done();
};

const jwt = () => {
    return expressJwt({
            secret: AUTH.JWT_SECRET,
            algorithms: ['HS256'],
            isRevoked
        }
    ).unless({
        // public routes that don't require authentication
        path: AUTH.NO_AUTH_PATHS
    });
};

export const getUserIdByToken = async (token: any) => {
    if (token) {
        const parsedToken = token.toString().includes('Bearer') ? token.split('Bearer ')[1] : token;
        const {sub: author}: any = verify(parsedToken, AUTH.JWT_SECRET as string);
        return {author} ;
    } else {
        return undefined;
    }
}

export default jwt;
