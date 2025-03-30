export default (env: any) => ({
    SERVER: {
        PORT: env.PORT,
    },
    APP: {
        PER_PAGE: env.PER_PAGE,
    },
    SOCKET: {
        SOCKET_ALLOWED_ORIGINS: '*',
    },
    MONGO: {
        MONGO_URI: env.STG_MONGO_URI
    },
    S3: {
        S3_BUCKET_NAME: env.S3_BUCKET_NAME,
        AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
        BUCKET_REGION: env.BUCKET_REGION,
        S3_PATH: `https://s3-${env.BUCKET_REGION}.amazonaws.com/${env.S3_BUCKET_NAME}/`
    },
    AUTH: {
        isActive: false,
        JWT_SECRET: env.JWT_SECRET,
        NO_AUTH_PATHS: [
            // '/',
            // '/get-ads',
            // '/users',
            '/add-new-user',
            // '/clear-users',
            // '/clear-ads',
            // '/like-ad',
        ]
    },
});

