import AWS from 'aws-sdk';
import {getConfig} from "../config";
import log from "../heplers/logger";
import crypto from 'crypto';

const {
    // AWS_ACCESS_KEY_ID,
    // AWS_SECRET_ACCESS_KEY,
    BUCKET_REGION,
    S3_BUCKET_NAME,
    S3_PATH
} = getConfig().S3;

const s3 = new AWS.S3({
    // accessKeyId: AWS_ACCESS_KEY_ID,
    // secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: BUCKET_REGION
});

const getParams = (file: Express.Multer.File, fileKey: string) => {
    return {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
    }
}


export const uploadFile = async (file: Express.Multer.File) => {
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const ext = file.originalname.split('.').pop();
    const hashedFileName = `${fileHash}.${ext}`;

    const params: any = getParams(file, hashedFileName);

    try {
        // check if file already exists
        try {
            await s3.headObject({ Bucket: S3_BUCKET_NAME, Key: hashedFileName }).promise();
            // If it exists, return its URL directly without uploading again
            return {
                Location: `${S3_PATH}${hashedFileName}`,
                Key: hashedFileName
            };
        } catch (err: any) {
            if (err.code !== 'NotFound') throw err; // Only ignore NotFound
        }

        const data = await s3.upload(params).promise();
        return {
            Location: data.Location,  // Full public URL
            Key: data.Key
        };
    } catch (err) {
        log.error(err);
        throw new Error('File upload failed');
    }
}




