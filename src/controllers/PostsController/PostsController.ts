import colors from "colors";
import UserModel from "../../models/UserModel";
import PostModel from "../../models/PostModel";
import {getUserIdByToken} from "../../services/authService";
import {getConfig} from "../../config";
import {uploadFile} from "../../services/uploadService";
import {getPostsFromFilters, getPagedPostsHandler, saveNewPostToDatabase} from "./PostsHandlers";
import {updatePostOwner} from "../UserController/UserHandlers";
import {Request, Response} from 'express';
import log from "../../heplers/logger";
import User from "../../models/UserModel";

const {
    brightCyan: dbColor,
    red: errorColor,
}: any = colors;

const {S3: {S3_PATH}} = getConfig();

class PostsController {

    async index(req: Request, res: Response) {
        log.info('-- PostsController method ".index" called --');
        log.info(`query: ${JSON.stringify(req?.query)}`);

        const reqPage = Number(req.query['page']);

        if (!req.query['page']) {
            const result = await getPagedPostsHandler();
            log.info(`response: ${JSON.stringify(result)}`);

            res.json(result);
        } else {
            const result = await getPagedPostsHandler(reqPage);
            log.info(`response: ${JSON.stringify(result)}`);

            if (!result) {
                res.status(404).json({
                    message: `Error. Can't handle posts at page №: ${+req.query['page']}`,
                    posts: result
                })
            } else {
                res.json(result)
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

        try {
            // Extract user ID from token
            const {sub: userId}: any = await getUserIdByToken(req.headers.authorization);

            // Find user
            const user: any = await User.findById(userId);
            if (!user) {
                log.info('User does not exist');
                return res.status(404).json({message: 'User not found'});
            }

            // Optionally, check if the post exists
            const post = await PostModel.findById(postId);
            if (!post) {
                log.info('Post does not exist');
                return res.status(404).json({message: 'Post not found'});
            }

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
        } catch (error) {
            console.error(error);
            return res.status(500).json({message: 'Internal server error'});
        }
    }

    async read(req: Request, res: Response) {
        log.info('-- PostsController method ".read" called --');

        await PostModel.findOne({_id: req.params.id}).populate({
            path: 'author',
            select: '-likedPosts'
        }).then((ad: any) => {
            if (!ad) {
                res.json({
                    resultCode: res.statusCode,
                    message: `Post with id ${req.params.id} not found in DB`,
                })
                log.info(errorColor(`Post with id ${req.params.id} not found in DB`))
            } else {
                res.json({
                    resultCode: res.statusCode,
                    message: `Post with id ${req.params.id} found successfully in DB`,
                    ad
                })
                log.info(dbColor(`Post with id ${req.params.id} found successfully in DB`))
            }
        })
    }

    async update(req: Request, res: Response) {
        log.info('-- PostsController method ".update" called --');
        const {params} = req || {};
        const paramsId = params.id;
        let file;

        if (req.file) {
            file = await uploadFile(req.file);
        }

        await PostModel.findByIdAndUpdate(paramsId, {
            $set: {
                ...req.body,
                // @ts-ignore
                img: file ? S3_PATH + file.originalname : ''
            }
        }, (err: any) => {
            if (err) {
                res.json({
                    resultCode: res.statusCode,
                    message: err
                })
                log.info(errorColor(`Error, cannot update Post with id ${req.params.id}: `), err)
            } else {
                res.json({
                    resultCode: res.statusCode,
                    message: `Post with id ${req.params.id} is successfully updated`
                })
                log.info(dbColor(`Post with id ${req.params.id} is successfully updated`, req.body))
            }
        })
    }

    async delete(req: Request, res: Response) {
        log.info('-- PostsController method ".delete" called --');

        const {author: userId}: any = await getUserIdByToken(req.headers.authorization);
        const deletedAd = await PostModel.findByIdAndDelete(req.params.id).exec();
        log.info("Deleted Ad: ", deletedAd);
        await UserModel.updateMany({}, {$pull: {likedAds: req.params.id, ads: req.params.id}});
        const userAds = await UserModel.findById(userId, {ads: '$ads'}).populate('ads');

        if (userAds) {
            res.json({
                resultCode: 201,
                message: `Post with id ${req.params.id} successfully deleted from DB`,
                ads: userAds
            })
            log.info(dbColor(`Post with id ${req.params.id} successfully deleted from DB`))
        } else {
            res.json({
                resultCode: 409,
                message: `Error, can\'t delete Post with id ${req.params.id} from DB`
            })
            log.info(errorColor(`Error, can\'t delete Post with id ${req.params.id} from DB`))
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
