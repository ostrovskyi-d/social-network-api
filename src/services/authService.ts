// @ts-ignore
import {getConfig} from '../config';
import {verify} from "jsonwebtoken";
import {expressjwt} from "express-jwt";
import log from "../heplers/logger";

const config = getConfig();
const {AUTH} = config;


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
    try {
        const parsedToken: string | undefined = token?.toString().includes('Bearer') ? token.split('Bearer ')[1] : token;

        if (parsedToken) {
            const verifyResult = verify(parsedToken, AUTH.JWT_SECRET as string);

            return verifyResult;
        } else {
            throw new Error(`Can't parse token`);
        }
    } catch (error) {
        log.error(error);
        throw error;
    }
}

export default jwt;
