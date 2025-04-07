import {getConfig} from "../../config";
import User from '../../models/UserModel';
import colors from "colors";
import jwt, {JsonWebTokenError} from 'jsonwebtoken';
import {getUserIdByToken} from "../../services/authService";
import PostModel from "../../models/PostModel";
import {uploadFile} from "../../services/uploadService";
import {Request, Response} from 'express';
import log from "../../heplers/logger";
import bcrypt from 'bcrypt';
import {userMapping} from "../../mappings/userMapping";
import {errorTypes} from "../../consts/errorTypes";

const {brightCyan: dbColor, red: errorColor}: any = colors;
const config = getConfig();
const S3_PATH = config.S3.S3_PATH;
const JWT_SECRET = config.AUTH.JWT_SECRET;

class UserController {
    async index(req: Request, res: Response) {
        log.info('-- UserController method ".index" called --');

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
                errorType: errorTypes.ServerError,
                message: "Internal Server Error",
                error: err.message
            });
        }
    }

    async create(req: Request, res: Response) {
        log.info('-- UserController method ".create" called --');

        const {body: {name, phone, email, password}, file} = req;

        if (!email || !password) {
            return res
                .status(400)
                .json({
                    errorType: errorTypes.InvalidCredentials,
                    message: "Please Input Username and Password"
                });
        }

        try {
            file && await uploadFile(file);

            // Hash The User's Password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            log.info(`hashedPassword: ${hashedPassword}`);

            const user = new User({
                name,
                phone,
                avatar: file ? S3_PATH + file.originalname : '',
                email: email,
                password: hashedPassword,
            });

            if (user) {
                const token = jwt.sign({sub: user._id}, JWT_SECRET as string, {expiresIn: '7d'});
                log.info("Bearer token: ", token);
                log.info("User ID: ", user._id);

                // @ts-ignore
                await user.save().then((doc, err) => {
                    if (err) {
                        return res.json({
                            errorType: errorTypes.ServerError,
                            message: err.message
                        })
                    }
                    res.json({
                        message: `User with id ${doc._id} successfully saved to DB`,
                        data: {
                            token,
                            user: userMapping(user),
                        }
                    })
                    log.info(`User with id ${doc._id} successfully saved to DB`);
                })
            }
        } catch (err) {
            res.status(500).json({
                errorType: errorTypes.ServerError,
                message: `Error: User with name ${name} can't be created.`
            })
            log.error(`Error: User with name ${name} can't be created: ${JSON.stringify(err)}`);
        }
    }

    async login(req: Request, res: Response) {
        log.info('-- UserController method ".login" called --');

        try {
            const {body: {email, password}} = req || {};

            // Check If The Input Fields are Valid
            if (!email || !password) {
                return res
                    .status(400)
                    .json({
                        errorType: errorTypes.InvalidRequest,
                        message: "Please Input Username and Password"
                    });
            }

            // Check If User Exists In The Database
            const user = await User.findOne({email}).select('+password');

            if (!user) {
                return res.status(401).json({
                    errorType: errorTypes.InvalidCredentials,
                    message: "Invalid username or password"
                });
            }

            const {password: userStoredPassword}: any = user || {};

            const passwordMatch = await bcrypt.compare(password, userStoredPassword);

            if (!passwordMatch) {
                return res.status(401).json({
                    errorType: errorTypes.InvalidCredentials,
                    message: "Invalid username or password"
                });
            }

            const token = jwt.sign({sub: user._id}, JWT_SECRET as string, {expiresIn: '7d'});
            log.info("Bearer token: ", token);
            log.info("User ID: ", user._id);

            res.status(200).json({
                message: 'Success',
                data: {
                    userId: user._id,
                    token
                }
            });
        } catch (err) {
            res.status(500).json({
                errorType: errorTypes.ServerError,
                message: `Server internal error.`
            })
            log.error(err);
        }
    }

    async update(req: Request, res: Response) {
        log.info('-- UserController method ".update" called --');

        try {
            const {body, headers, files} = req;

            const {sub: tokenUserId}: any = await getUserIdByToken(headers.authorization);
            const userId = tokenUserId;

            // Files will be available under files.avatar[0], files.background[0]
            const avatarFile = (files as any)?.avatar?.[0];
            const backgroundFile = (files as any)?.background?.[0];

            let avatarLink = '';
            let backgroundLink = '';

            if (avatarFile) {
                const uploaded = await uploadFile(avatarFile);
                avatarLink = uploaded?.Location || `${S3_PATH}${avatarFile.originalname}`;
                log.info(`Avatar file uploaded: ${avatarLink}`);
            }

            if (backgroundFile) {
                const uploaded = await uploadFile(backgroundFile);
                backgroundLink = uploaded?.Location || `${S3_PATH}${backgroundFile.originalname}`;
                log.info(`Background file uploaded: ${avatarLink}`);
            }

            const updateData: any = {
                ...body
            };

            if (avatarLink || backgroundLink) {
                updateData.photos = {};
                if (avatarLink) updateData.photos.avatar = avatarLink;
                if (backgroundLink) updateData.photos.background = backgroundLink;
            }

            await User.findByIdAndUpdate(userId, {$set: updateData});
            const updatedUser = await User.findById(userId).exec();

            res.status(200).json({
                message: `User successfully updated`,
                data: updatedUser
            });
        } catch (err: any) {
            log.error(err);
            res.status(500).json({
                errorType: errorTypes.ServerError,
                message: `Server internal error.`
            })
        }
    }

    async auth(req: Request, res: Response) {
        log.info('-- UserController method ".auth" called --');

        try {
            const {sub: userId}: any = await getUserIdByToken(req.headers.authorization);

            const {_id, name, email}: any = await User.findById(userId);

            res.json({
                message: 'Success',
                data: {
                    userId: _id,
                    name: name,
                    email: email,
                }
            });
        } catch (err: any) {
            log.error(err);
            if (err instanceof JsonWebTokenError) {
                res.status(401).json({
                    errorType: errorTypes.Unauthorized,
                    message: err.message
                })
            } else {
                res.status(500).json({
                    errorType: errorTypes.ServerError,
                    message: `Server internal error.`
                });
            }
        }
    }

    async delete(req: Request, res: Response) {
        log.info('-- UserController method ".delete" called --');

        try {
            const {sub: userId}: any = await getUserIdByToken(req.headers.authorization)

            await User.deleteOne({_id: userId}).then(async (user: any) => {
                if (user) {
                    await PostModel.deleteMany({'author': userId});

                    res.json({
                        message: `User with id ${userId} successfully deleted from DB`
                    })
                    log.info(dbColor(`User with id ${userId} successfully deleted from DB`))
                } else {
                    res.json({
                        errorType: errorTypes.NotFound,
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

    async readById(req: Request, res: Response) {
        log.info('-- UserController method ".readById" called --');
        try {
            const user = await User.findById(req.params.id)
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

            log.info(`User with ID: ${req.params.id} successfully found in DB`);

            res.status(200).json({
                message: 'User successfully found',
                data: user
            })
        } catch (err) {
            log.error(err);
            res.status(500).json({
                errorType: errorTypes.ServerError,
                message: `Server internal error.`
            })
        }
    }

    async readMy(req: Request, res: Response) {
        log.info('-- UserController method ".readMy" called --');
        try {
            const {sub: tokenUserId}: any = await getUserIdByToken(req.headers.authorization);

            console.log('token ID: ', tokenUserId);

            const user = await User.findOne({_id: tokenUserId}, '-likedPosts -posts');

            if (user) {
                res.status(200).json({
                    message: `User with id ${tokenUserId} found successfully in DB`,
                    data: user
                })
                log.info(dbColor(`User with id ${tokenUserId} found successfully in DB`))
            } else {
                res.status(404).json({
                    errorType: errorTypes.NotFound,
                    message: `User with id ${tokenUserId} not found in DB`
                })
                log.info(errorColor(`User with id ${tokenUserId} not found in DB`))
            }
        } catch (err) {
            res.status(500).json({message: 'Internal server error'})
            log.error(err)
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
