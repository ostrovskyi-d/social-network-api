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

const {PER_PAGE, S3: {S3_PATH}} = getConfig();

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

        const {file, body, query, headers: {authorization}} = req || {};
        const {
            title,
            // categoryId,
            // subCategoryId,
            // selectedCategories,
            // selectedSubCategories
        } = body || {};
        const {sub: author}: any = await getUserIdByToken(authorization);
        // const perPage = Number(PER_PAGE);
        // const reqPage = Number(query['page']) || 1;
        // const adsTotalPromise = await PostModel.countDocuments({});
        // const adsTotal = await adsTotalPromise;
        // const totalPages = Math.ceil(adsTotal / perPage);

        file && await uploadFile(file);

        // Create Ad
        const post = new PostModel({
            title: title,
            img: file ? S3_PATH + file.originalname : '',
            author: author,
            // categoryId: categoryId || '1',
            // subCategoryId: subCategoryId || '1'
        });

        const savedPost = await saveNewPostToDatabase(post);

        if (!!savedPost) {
            // Update user with ref to this ad
            await updatePostOwner(post, author);
            res.json(savedPost)
        }
        // Return ads
        // return ads that matches selected categories
        // if (selectedCategories || selectedSubCategories) {
        //     if (!selectedCategories.length && !selectedSubCategories.length) {
        //         if (!reqPage) {
        //             const result = await getPagedPostsHandler();
        //             res.json(result);
        //         } else {
        //             const result = await getPagedPostsHandler(reqPage);
        //
        //             if (!result) {
        //                 res.status(404).json({
        //                     message: `Error. Can't handle posts at page №: ${reqPage}`,
        //                     ads: result
        //                 })
        //             } else {
        //                 res.json(result)
        //             }
        //         }
        //     } else {
        //
        //         const {totalPages, posts, selectedAdsCount} = await getPostsFromFilters({
        //             selectedCategories,
        //             selectedSubCategories,
        //             perPage,
        //             reqPage
        //         });
        //
        //         // log.info(dbColor(result));
        //         res.json({
        //             message: `Ads successfully found`,
        //             ads: posts,
        //             adsTotal: selectedAdsCount,
        //             totalPages: totalPages,
        //             perPage,
        //             currentPage: reqPage,
        //         });
        //     }
        // } else {
        //     // Save new ad
        //     const savedAd = await saveNewPostToDatabase(ad);
        //     if (!!savedAd) {
        //         // Update user with ref to this ad
        //         await updateAdOwner(ad, author);
        //         res.json(savedAd)
        //     }
        // }
    }


    async like(req: Request, res: Response) {
        console.log('req.body: ', req.body);

        const { postId } = req.body;

        try {
            // Extract user ID from token
            const { sub: userId }: any = await getUserIdByToken(req.headers.authorization);

            // Find user
            const user: any = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Optionally, check if the post exists
            const post = await PostModel.findById(postId);
            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            const hasLiked = post.likes.users.includes(userId);

            if (hasLiked) {
                // Remove userId from post.likes.users and postId from user.likedPosts
                await Promise.all([
                    PostModel.findByIdAndUpdate(postId, {
                        $pull: { "likes.users": userId }
                    }),
                    User.findByIdAndUpdate(userId, {
                        $pull: { likedPosts: postId }
                    })
                ]);

                return res.status(200).json({ message: 'Post unliked successfully' });

            } else {
                // Add userId to post.likes.users and postId to user.likedPosts
                await Promise.all([
                    PostModel.findByIdAndUpdate(postId, {
                        $addToSet: { "likes.users": userId }
                    }),
                    User.findByIdAndUpdate(userId, {
                        $addToSet: { likedPosts: postId }
                    })
                ]);

                return res.status(200).json({ message: 'Post liked successfully' });
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal server error' });
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
