import {getConfig} from "../../config";
import User, {UserInterface} from '../../models/UserModel';
import jwt from 'jsonwebtoken';
import {getUserIdByToken} from "../../services/authService";
import PostModel from "../../models/PostModel";
import {uploadFile} from "../../services/uploadService";
import {Request, Response} from 'express';
import log from "../../heplers/logger";
import bcrypt from 'bcrypt';
import {ErrorTypes} from "../../consts/errorTypes";
import mongoose from "mongoose";
import {CastError, InvalidRequestError, NotFoundError, ServerError} from "../../services/errorService";
import {UsersFilters} from "../../consts/usersFilters";
import {userMapping} from "../../mappings/userMapping";

const config = getConfig();
const S3_PATH = config.S3.S3_PATH;
const JWT_SECRET = config.AUTH.JWT_SECRET;

class UserController {
    async index(req: Request, res: Response) {
        log.info('-- UserController method ".index" called --');
        try {

            const {
                count,
                page,
                search,
                selectedUsers,
                filters
            }: any = req.body;
            const {sub: tokenOwnerId}: any = await getUserIdByToken(req.headers.authorization);
            const perPage = Number(count) || 10;  // Default perPage to 10 if not provided
            const reqPage = Math.max(Number(page) || 1, 1); // Ensure page is at least 1
            const searchQuery = search ? String(search) : null;

            const filter: any = {};

            if (selectedUsers && selectedUsers.length) {
                const mappedUsers = selectedUsers.map((userId: any) => new mongoose.Types.ObjectId(userId))
                filter._id = {$in: mappedUsers};
            }

            // Apply search filter if searchQuery is present
            if (searchQuery) {
                filter.name = {$regex: searchQuery, $options: 'i'};
            }

            // Apply the following filter if isFollowing is true
            if (filters?.includes(UsersFilters.Following)) {
                filter.followedBy = new mongoose.Types.ObjectId(tokenOwnerId as string);
            }

            if (filters?.includes(UsersFilters.Followed)) {
                const tokenUser = await User.findById(tokenOwnerId);
                filter._id = {$in: tokenUser?.following || []};
            }

            filter._id = {$ne: tokenOwnerId, ...filter._id};

            // Get total user count with applied filters
            const usersTotal = await User.countDocuments(filter);
            const totalPages = Math.ceil(usersTotal / perPage);

            const populateCondition: any = selectedUsers
                ? {path: 'followedBy following', select: 'name photos'}
                : null;

            // Fetch users with applied filters and pagination
            const users = await User.find(filter, '-posts -likedPosts')
                .skip((reqPage - 1) * perPage)
                .limit(perPage)
                .populate(populateCondition)
                .sort({createdAt: -1})

            log.info(`Users are successfully found. Total: ${users.length}`);

            res.status(200).json({
                message: "Users are successfully found",
                data: {
                    usersTotal,
                    totalPages,
                    perPage,
                    currentPage: reqPage,
                    users,
                }
            });
        } catch (err) {
            log.error(err);
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }
    }

    async create(req: Request, res: Response) {
        log.info('-- UserController method ".create" called --');

        try {

            const {body: {name, phone, email, password}, file} = req;

            if (!email || !password) {
                throw new InvalidRequestError('Please Input Username and Password')
            }

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
                console.log("Bearer token: ", token);
                console.log("User ID: ", user._id);

                // @ts-ignore
                await user.save().then((doc, err) => {
                    if (err) {
                        throw new ServerError('');
                    }
                    res.json({
                        message: `User with id ${doc._id} is successfully saved to DB`,
                        data: {
                            token,
                            user,
                        }
                    })
                    log.info(`User with id ${doc._id} is successfully saved to DB`);
                })
            }
        } catch (err) {
            log.error(err);
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }
    }

    async login(req: Request, res: Response) {
        log.info('-- UserController method ".login" called --');

        try {

            const {body: {email, password}} = req || {};

            // Check If The Input Fields are Valid
            if (!email || !password) {
                throw new InvalidRequestError('Please Input Email and Password');
            }

            // Check If User Exists In The Database
            const user = await User.findOne({email}).select('+password');

            if (!user) {
                return res.status(401).json({
                    errorType: ErrorTypes.InvalidCredentials,
                    message: "Invalid username or password"
                });
            }

            const {password: userStoredPassword}: any = user || {};

            const passwordMatch = await bcrypt.compare(password, userStoredPassword);

            if (!passwordMatch) {
                return res.status(401).json({
                    errorType: ErrorTypes.InvalidCredentials,
                    message: "Invalid username or password"
                });
            }

            const token = jwt.sign({sub: user._id}, JWT_SECRET as string, {expiresIn: '7d'});

            console.log("Bearer token: ", token);
            console.log("User ID: ", user._id);

            res.status(200).json({
                message: 'Success',
                data: {
                    userId: user._id,
                    token
                }
            });
        } catch (err) {
            log.error(err);
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }
    }

    async follow(req: Request, res: Response) {
        log.info('-- UserController method ".follow" called --');
        try {

            const {id: followId} = req.params;
            const {sub: tokenOwnerId} = await getUserIdByToken(req.headers.authorization);

            console.log('followId: ', followId)
            console.log('tokenOwnerId: ', tokenOwnerId);

            if (followId === tokenOwnerId) {
                throw new InvalidRequestError(`You can't follow yourself`);
            }

            const userTokenOwner: any = await User.findById(tokenOwnerId);
            const userToFollow: any = await User.findById(followId);

            if (!userToFollow) {
                throw new NotFoundError(`User with id ${followId} was not found in DB`);
            }

            const isAlreadyFollowing = userTokenOwner.following.map((id: any) => id.toString()).includes(followId);

            await Promise.all([
                User.findByIdAndUpdate(tokenOwnerId,
                    isAlreadyFollowing ? {$pull: {"following": followId}} : {$addToSet: {"following": followId}}
                ),
                User.findByIdAndUpdate(followId,
                    isAlreadyFollowing ? {$pull: {"followedBy": tokenOwnerId}} : {$addToSet: {"followedBy": tokenOwnerId}}
                )
            ]);


            res.status(200).json({
                message: `User with ID ${followId} was successfully ${isAlreadyFollowing ? 'unfollowed' : 'followed'}`
            })
        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }

    }

    async update(req: Request, res: Response) {
        log.info('-- UserController method ".update" called --');
        try {
            const {body, headers, files} = req;

            console.log('req.body: ', JSON.stringify(body));
            console.log('req.files: ', JSON.stringify(files));

            const {sub: tokenUserId}: any = await getUserIdByToken(headers.authorization);
            const tokenUser: any = await User.findById(tokenUserId);

            log.info(`tokenUserId: ${tokenUserId}`);

            const userId = tokenUserId;

            // Files will be available under files.avatar[0], files.background[0]
            const avatarFile = (files as any)?.avatar?.[0];
            const backgroundFile = (files as any)?.background?.[0];

            let avatarLink: any = tokenUser.photos.avatar || '';
            let backgroundLink = tokenUser.photos.background || '';

            console.warn(tokenUser);

            console.warn('avatarLink: ', avatarLink);
            console.warn('backgroundLink: ', backgroundLink);

            if (avatarFile) {
                const result: any = await uploadFile(avatarFile);
                if (result.uploaded) {
                    avatarLink = result?.location || `${S3_PATH}${avatarFile.originalname}`;
                    log.info(`Avatar file uploaded: ${avatarLink}`);
                } else {
                    log.info(`Avatar not uploaded, file already exists; file location: ${result.location}`);
                }
            }

            if (backgroundFile) {
                const result = await uploadFile(backgroundFile);
                if (result.uploaded) {
                    backgroundLink = result?.location || `${S3_PATH}${backgroundFile.originalname}`;
                    log.info(`Background file uploaded: ${avatarLink}`);
                } else {
                    log.info(`Background not uploaded, file already exists; file location: ${result.location}`);
                }
            }

            const updateData: UserInterface = userMapping(body)

            if (avatarLink || backgroundLink) {
                updateData.photos = {};
                if (avatarLink) updateData.photos.avatar = avatarLink;
                if (backgroundLink) updateData.photos.background = backgroundLink;
            }

            await User.findByIdAndUpdate(userId, {$set: updateData});
            const updatedUser = await User.findById(userId);

            res.status(200).json({
                message: `User successfully updated`,
                data: updatedUser
            });
        } catch (err) {
            log.error(err);
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }
    }

    async auth(req: Request, res: Response) {
        log.info('-- UserController method ".auth" called --');
        try {

            const {sub: userId}: any = await getUserIdByToken(req.headers.authorization);

            const {_id, name, email}: any = await User.findById(userId);

            res.json({
                message: 'You are successfully authorized',
                data: {
                    userId: _id,
                    name: name,
                    email: email,
                }
            });
        } catch (err) {
            log.error(err);
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }
    }

    async delete(req: Request, res: Response) {
        log.info('-- UserController method ".delete" called --');
        try {

            const {sub: userId}: any = await getUserIdByToken(req.headers.authorization)

            await User.deleteOne({_id: userId}).then(async (user: any) => {
                if (!user) {
                    throw new NotFoundError(`Error, can\'t delete User with id ${userId} from DB. Reason: user is not found`);
                }

                await PostModel.deleteMany({'author': userId});

                log.info(`User with id ${userId} is successfully deleted from DB`)

                res.json({
                    message: `User with id ${userId} is successfully deleted from DB`
                })
            })
        } catch (err) {
            log.error(err);
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }
    }

    async readById(req: Request, res: Response) {
        log.info('-- UserController method ".readById" called --');
        try {

            const id = req.params.id;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                const errorString = `Invalid user id format: ${id}`;
                throw new CastError(errorString);
            }

            const user: any = await User.findById(id, '-likedPosts -posts');

            if (!user) {
                const errorString = `Can't find user with id: ${id} in DB`
                throw new NotFoundError(errorString)
            }

            log.info(`User with ID: ${id} is successfully found in DB`);

            res.status(200).json({
                message: 'User is successfully found',
                data: user
            })
        } catch (err) {
            log.error(err);
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }
    }

    async readMy(req: Request, res: Response) {
        log.info('-- UserController method ".readMy" called --');
        try {

            const {sub: tokenUserId}: any = await getUserIdByToken(req.headers.authorization);

            console.log('token ID: ', tokenUserId);

            const user = await User.findOne({_id: tokenUserId}, '-likedPosts -posts -isFollowedByMe');

            if (!user) {
                throw new NotFoundError(`User with id ${tokenUserId} not found in DB`)
            }

            log.info(`User with id ${tokenUserId} is successfully found in DB`)

            res.status(200).json({
                message: `User with id ${tokenUserId} is successfully found in DB`,
                data: user
            })
        } catch (err) {
            log.error(err);
            res.status(500).json({
                message: 'Server error',
                errorType: ErrorTypes.ServerError
            })
        }
    }

    async _clearUsersCollection(req: Request, res: Response) {
        await User.deleteMany({}, (users: any) => {
            res.json({
                users,
                message: "ONLY FOR DEV ENV: All users are successfully removed from db"
            })
        });
    }
}

export default UserController;
