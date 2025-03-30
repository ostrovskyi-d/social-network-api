import AWS from 'aws-sdk';
import {getConfig} from "../config";
import log from "../heplers/logger";

const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    BUCKET_REGION,
    S3_BUCKET_NAME,
    S3_PATH
} = getConfig().S3;

const s3 = new AWS.S3({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: BUCKET_REGION
});

const getParams = (file: any) => {
    return {
        Bucket: S3_BUCKET_NAME,
        Key: file.originalname,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
    }
}

export const deleteFile = async (file: any) => {
    const params: any = getParams(file);
    await s3.deleteObject(params, function (err: any, data: any) {
        if (err) {
            log.info(err);
        } else {
            log.info("File successfully deleted")
        }
    })
}

export const uploadFile = async (file: any) => {
    const params: any = getParams(file)
    return s3.upload(params, function (err: any, data: any) {
        if (err) {
            log.info(err);
        } else {
            return {
                fileLink: S3_PATH + file.originalname,
                s3_key: params['Key']
            };
        }
    });
}




