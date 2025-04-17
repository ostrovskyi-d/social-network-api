import colors from "colors";
import UserModel from "../../models/UserModel";
import PostModel from "../../models/PostModel";
import {getUserIdByToken} from "../../services/authService";
import {getConfig} from "../../config";
import {uploadFile} from "../../services/uploadService";
import {getPagedPostsHandler, saveNewPostToDatabase} from "./PostsHandlers";
import {updatePostOwner} from "../UserController/UserHandlers";
import {Request, Response} from 'express';
import log from "../../heplers/logger";
import User from "../../models/UserModel";
import {errorTypes} from "../../consts/errorTypes";
import {NotFoundError} from "../../services/errorService";
import {catchAsync} from "../../decorators/catchAsync";

const {
    brightCyan: dbColor,
    red: errorColor,
}: any = colors;

const {S3: {S3_PATH}} = getConfig();

class PostsController {
    @catchAsync()

    async index(req: Request, res: Response) {
        log.info('-- PostsController method ".index" called --');
        log.info(`body: ${JSON.stringify(req?.body)}`);

        try {
            const result = await getPagedPostsHandler(req.body);
            log.info(`response: ${JSON.stringify(result)}`);

            res.status(200).json(result);
        } catch (err: any) {
            log.error(err);

            if (err instanceof NotFoundError) {
                res.status(404).json(err);
            } else {
                res.status(500).json({
                    errorType: errorTypes.ServerError,
                    message: err.message,
                })
            }
        }
    }

    async create(req: Request, res: Response) {
        log.info('-- PostsController method ".create" called --');

        const {file, body, headers: {authorization}} = req || {};
        const {title} = body || {};
        const {sub: author}: any = await getUserIdByToken(authorization);

        file && await uploadFile(file);

        // Create Ad
        const post = new PostModel({
            title: title,
            img: file ? S3_PATH + file.originalname : '',
            author: author,
        });

        const savedPost = await saveNewPostToDatabase(post);

        if (!!savedPost) {
            // Update user with ref to this ad
            await updatePostOwner(post, author);
            res.json(savedPost)
        }
    }


    async like(req: Request, res: Response) {
        log.info('-- PostsController method "like" called --');

        const {postId} = req.body;

        // Extract user ID from token
        const {sub: userId}: any = await getUserIdByToken(req.headers.authorization);

        // Find user
        const user: any = await User.findById(userId);
        if (!user) throw new NotFoundError('User was not found');

        // Optionally, check if the post exists
        const post = await PostModel.findById(postId);
        if (!post) throw new NotFoundError('Post was not found');

        const hasLiked = post.likes.users.includes(userId);

        await Promise.all([
            PostModel.findByIdAndUpdate(postId,
                hasLiked ? {$pull: {"likes.users": userId}} : {$addToSet: {"likes.users": userId}}
            ),
            User.findByIdAndUpdate(userId,
                hasLiked ? {$pull: {likedPosts: postId}} : {$addToSet: {likedPosts: postId}}
            )
        ]);

        return res.status(200).json({
            message: hasLiked ? 'Post unliked successfully' : 'Post liked successfully'
        });
    }

    async read(req: Request, res: Response) {
        log.info('-- PostsController method ".read" called --');

        await PostModel.findOne({_id: req.params.id}).populate({
            path: 'author',
            select: '-likedPosts'
        }).then((ad: any) => {
            if (!ad) {
                throw new NotFoundError(`Post with id ${req.params.id} not found in DB`)
            }

            log.info(dbColor(`Post with id ${req.params.id} found successfully in DB`))

            res.json({
                message: `Post with id ${req.params.id} found successfully in DB`,
                ad
            })
        })
    }

    async update(req: Request, res: Response) {
        log.info('-- PostsController method ".update" called --');
        const {params} = req || {};
        const paramsId = params.id;
        let file;

        try {
            if (req.file) {
                file = await uploadFile(req.file);
            }
        } catch (err) {
            log.error(err);
        }

        await PostModel.findByIdAndUpdate(paramsId, {
            $set: {
                ...req.body,
                // @ts-ignore
                img: file ? S3_PATH + file.originalname : ''
            }
        }, (err: any) => {
            if (!err) {
                res.json({
                    message: `Post with id ${req.params.id} is successfully updated`
                })
                log.info(dbColor(`Post with id ${req.params.id} is successfully updated`, req.body))
            }
        })
    }

    async delete(req: Request, res: Response) {
        log.info('-- PostsController method ".delete" called --');

        const {sub: userId}: any = await getUserIdByToken(req.headers.authorization);
        const deletedAd = await PostModel.findByIdAndDelete(req.params.id).exec();
        log.info("Deleted Ad: ", deletedAd);
        await UserModel.updateMany({}, {$pull: {likedAds: req.params.id, ads: req.params.id}});
        const userAds = await UserModel.findById(userId, {ads: '$ads'}).populate('ads');

        if (userAds) {
            res.json({
                message: `Post with id ${req.params.id} successfully deleted from DB`,
                ads: userAds
            })
            log.info(dbColor(`Post with id ${req.params.id} successfully deleted from DB`))
        } else {
            res.json({
                errorType: errorTypes.NotFound,
                message: `Error, can\'t delete Post with id ${req.params.id} from DB`
            })
            log.error(`Error, can\'t delete Post with id ${req.params.id} from DB`)
        }

    }

    async _clearPostsCollection(req: Request, res: Response) {
        log.info('-- PostsController method "._clearAdsCollection" called --');

        await PostModel.deleteMany({}, (ads: any) => {
            res.json({
                ads,
                message: "ONLY FOR DEV ENV: All posts successfully removed from db. Also removed posts links in categories"
            })
        });
    }
}

export default PostsController;
