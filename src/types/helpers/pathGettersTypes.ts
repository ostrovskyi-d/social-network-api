import { Secret } from "jsonwebtoken";

export type Config = {
    NODE_ENV: string | undefined,
    PORT: string | undefined,
    PER_PAGE: string | undefined,
    DEV_ROOT_URL: string | undefined,
    ROOT_URL: string | undefined,
    SOCKET_ALLOWED_ORIGINS: Array<string>,
    mongo: {
        DEV_MONGO_URI: string | undefined,
        MONGO_URI: string | undefined,
        LOCAL_DEV_MONGO_URI: string | undefined,
    },
    s3: {
        S3_BUCKET_NAME: string | undefined,
        AWS_ACCESS_KEY_ID: string | undefined,
        AWS_SECRET_ACCESS_KEY: string | undefined,
        BUCKET_REGION: string | undefined,
        S3_PATH: string | undefined,
    },
    AUTH: {
        JWT_SECRET: Secret | undefined,
        isActive: boolean,
        NO_AUTH_PATHS: Array<string>,
    },

}