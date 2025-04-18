import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {getConfig} from "../config";
import log from "../heplers/logger";
import crypto from 'crypto';
import {ServerError} from "./errorService";

const {
    BUCKET_REGION,
    S3_BUCKET_NAME,
    S3_PATH
} = getConfig().S3;

const s3Client = new S3Client({ region: BUCKET_REGION });

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
        // Check if the file already exists
        try {
            const headCommand = new HeadObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: hashedFileName
            });
            await s3Client.send(headCommand);

            // If it exists, return its URL directly
            return {
                Location: `${S3_PATH}${hashedFileName}`,
                Key: hashedFileName
            };
        } catch (err: any) {
            if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
                log.error(err);
                throw err;
            }
        }

        // Upload the file
        const putCommand = new PutObjectCommand(params);
        await s3Client.send(putCommand);

        return {
            Location: `${S3_PATH}${hashedFileName}`,  // Constructed URL
            Key: hashedFileName
        };
    } catch (err) {
        log.error(err);
        throw new ServerError('File upload failed');
    }
}
