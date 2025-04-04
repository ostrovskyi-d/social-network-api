import {getConfig} from "../../config";
import User from '../../models/UserModel';
import colors from "colors";
import jwt from 'jsonwebtoken';
import {getUserIdByToken} from "../../services/authService";
import PostModel from "../../models/PostModel";
import {uploadFile} from "../../services/uploadService";
import {Request, Response} from 'express';
import log from "../../heplers/logger";
import logger from "../../heplers/logger";

const {brightCyan: dbColor, red: errorColor}: any = colors;
const config = getConfig();
const S3_PATH = config.S3.S3_PATH;
const JWT_SECRET = config.AUTH.JWT_SECRET;

class UserController {
    async index(req: Request, res: Response) {
        try {
            const perPage = Number(req.query['count']) || 10;  // Default perPage to 10 if not provided
            const reqPage = Math.max(Number(req.query['page']) || 1, 1); // Ensure page is at least 1
            const isFollowing = req.query['following'] === 'true';  // Convert to boolean
            const searchQuery = req.query['search'] ? String(req.query['search']) : null;

            const filter: any = {};

            // Apply search filter if searchQuery is present
            if (searchQuery) {
                filter.name = {$regex: searchQuery, $options: 'i'};
            }

            // Apply following filter if isFollowing is true
            if (isFollowing) {
                filter.following = {$exists: true, $ne: []};
            }

            // Get total user count with applied filters
            const usersTotal = await User.countDocuments(filter);
            const totalPages = Math.ceil(usersTotal / perPage);

            // Fetch users with applied filters and pagination
            const users = await User.find(filter)
                .skip((reqPage - 1) * perPage)
                .limit(perPage)
                .populate({path: 'following', select: 'name photos'})
                .sort({createdAt: -1})
                .exec();

            log.info(`Users successfully found. Total: ${users.length}`);

            res.status(200).json({
                message: "Users successfully found",
                data: {
                    users,
                    usersTotal,
                    totalPages,
                    perPage,
                    currentPage: reqPage
                }
            });
        } catch (err: any) {
            log.error(`Error fetching users: ${err.message}`);
            res.status(500).json({
                message: "Internal Server Error",
                error: err.message
            });
        }
    }

    async create(req: Request, res: Response) {
        const {body: {name, phone, email}, file} = req;

        try {
            file && await uploadFile(file);

            const user = new User({
                name: name || 'Default',
                phone,
                avatar: file ? S3_PATH + file.originalname : '',
                email: email || 'test@test.ua'
            });
            if (user) {
                const token = jwt.sign({sub: user._id}, JWT_SECRET as string, {expiresIn: '7d'});
                log.info("Bearer token: ", token);
                log.info("User ID: ", user._id);

                // @ts-ignore
                await user.save().then((doc, err) => {
                    if (err) {
                        return res.json({
                            message: err.message
                        })
                    }
                    res.json({
                        message: `User with id ${doc._id} successfully saved to DB`,
                        user,
                        token,
                    })
                    log.info(`User with id ${doc._id} successfully saved to DB`);
                })
            }
        } catch (err) {
            res.status(500).json({
                message: `Error: User with name ${name} can't be created.`
            })
            log.error(`Error: User with name ${name} can't be created: ${JSON.stringify(err)}`);
        }
    }


    async update(req: Request, res: Response) {
        try {
            const {body, params, headers, file} = req;
            const {likedAds: likedPosts, name, phone} = body;

            const authorId = await getUserIdByToken(headers.authorization);

            file && await uploadFile(file);
            const userId = params?.id || authorId;

            await User.findByIdAndUpdate(userId, {
                $set: {
                    ...body,
                    avatar: file ? S3_PATH + file.originalname : ''
                }
            });
            await User.updateOne({_id: userId}, {$set: {...body}});
            const updatedUser: any = await User.findById(userId).exec();

            if (likedPosts) {
                res.json({likedAds: updatedUser['likedAds']})
            } else {
                res.json(updatedUser)
            }

        } catch (err: any) {
            log.error(err);
        }
    }

    async auth(req: Request, res: Response) {
        try {
            const {sub: userId}: any = await getUserIdByToken(req.headers.authorization);

            const {_id, name, email}: any = await User.findById(userId);

            res.json({
                userId: _id,
                name: name,
                email: email,
            });
        } catch (err) {
            res.status(500).json(err);
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const {author: userId}: any = await getUserIdByToken(req.headers.authorization)

            await User.deleteOne({_id: userId}).then(async (user: any) => {
                if (user) {
                    await PostModel.deleteMany({'author': userId});

                    res.json({
                        message: `User with id ${userId} successfully deleted from DB`
                    })
                    log.info(dbColor(`User with id ${userId} successfully deleted from DB`))
                } else {
                    res.json({
                        message: `Error, can\'t delete User with id ${userId} from DB. Reason: user not found`
                    })
                    log.info(errorColor(`Error, can\'t delete User with id ${userId} from DB. Reason: user not found`))
                }

            })
        } catch (err) {
            res.status(500).json(`Internal server error`)
            log.info(errorColor("Error: "), err)
        }
    }

    async read(req: Request, res: Response) {
        const getUser = async (req: any) => {
            log.info(`Request: `, req);

            if (req.params['my']) {
                return await User.findOne({_id: req.params.id}, 'likedPosts')
                    .populate({
                        path: 'likedPosts',
                        model: PostModel,
                        populate: {
                            path: 'author',
                            select: 'name phone'
                        }
                    })
                    .exec();
            } else {
                return await User.findOne({_id: req.params.id})
                    .populate({
                        path: 'posts',
                        model: PostModel,
                        populate: {
                            path: 'author',
                            select: 'name phone',
                        }
                    })
                    .populate('likedPosts')
                    .exec();
            }
        }
        try {
            let user = await getUser(req);
            log.info(user);
            if (user) {
                res.status(200).json({
                    message: `User with id ${req.params.id} found successfully in DB`,
                    user
                })
                log.info(dbColor(`User with id ${req.params.id} found successfully in DB`))
            } else {
                res.status(404).json({
                    message: `User with id ${req.params.id} not found in DB`
                })
                log.info(errorColor(`User with id ${req.params.id} not found in DB`))
            }
        } catch (err) {
            log.info(errorColor("Error: "), err)
        }
    }

    async _clearUsersCollection(req: Request, res: Response) {
        await User.deleteMany({}, (users: any) => {
            res.json({
                users,
                message: "ONLY FOR DEV ENV: All users successfully removed from db"
            })
        });
    }

    async getById(id: any) {
        return User.findById({_id: id});
    }
}

export default UserController;
