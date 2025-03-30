import {getConfig} from "../../config";
import User from '../../models/UserModel';
import colors from "colors";
import jwt from 'jsonwebtoken';
import {getUserIdByToken} from "../../services/authService";
import AdModel from "../../models/AdModel";
import {uploadFile} from "../../services/uploadService";
import {Request, Response} from 'express';
import log from "../../heplers/logger";

const {brightCyan: dbColor, red: errorColor}: any = colors;
const config = getConfig();
const S3_PATH = config.S3.S3_PATH;
const JWT_SECRET = config.AUTH.JWT_SECRET;

class UserController {
    async index(req: Request, res: Response) {
        try {
            const users = await User.find({}).exec();
            log.info(`Users successfully found`);
            res.json({
                resultCode: res.statusCode,
                message: `Users successfully found`, users
            });
        } catch (err) {
            log.info(`Error, can't find users: ${JSON.stringify(err)}`);
            res.json({
                resultCode: res.statusCode,
                message: err
            });

        }
    }

    async create(req: Request, res: Response) {
        const {body: {name, phone}, file} = req;

        try {
            file && await uploadFile(file);

            const user = new User({
                name: name || 'Default',
                phone: phone || '000000000',
                avatar: file ? S3_PATH + file.originalname : '',
            });
            if (user) {
                const token = jwt.sign({sub: user._id}, JWT_SECRET as string, {expiresIn: '7d'});
                log.info("Bearer token: ", token)
                log.info("User ID: ", user._id)

                // @ts-ignore
                await user.save().then((doc, err) => {
                    if (err) {
                        return res.json({
                            resultCode: res.statusCode,
                            message: err.message
                        })
                    }
                    res.json({
                        resultCode: res.statusCode,
                        message: `User with id ${doc._id} successfully saved to DB`,
                        user,
                        token,
                    })
                    log.info(`User with id ${doc._id} successfully saved to DB`);
                })
            }
        } catch (err) {
            res.json({
                resultCode: 409,
                message: `Error: User with name ${name} can't be created.`
            })
            log.error(`Error: User with name ${name} can't be created: ${JSON.stringify(err)}`);
        }
    }


    async update(req: Request, res: Response) {
        try {
            const {body, params, headers, file} = req;
            const {likedAds, name, phone} = body;
            // @ts-ignore
            const {author: updatedForId} = await getUserIdByToken(headers?.authorization);

            file && await uploadFile(file);
            const userId = params?.id || updatedForId;

            await User.findByIdAndUpdate(userId, {
                $set: {
                    ...body,
                    avatar: file ? S3_PATH + file.originalname : ''
                }
            });
            await User.updateOne({_id: userId}, {$set: {...body}});
            const updatedUser: any = await User.findById(userId).exec();

            if (likedAds) {
                res.json({likedAds: updatedUser['likedAds']})
            } else {
                res.json(updatedUser)
            }

        } catch (err: any) {
            log.error(err);
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const {author: userId}: any = await getUserIdByToken(req.headers.authorization)

            await User.deleteOne({_id: userId}).then(async (user: any) => {
                if (user) {
                    await AdModel.deleteMany({'author': userId});

                    res.json({
                        resultCode: res.statusCode,
                        message: `User with id ${userId} successfully deleted from DB`
                    })
                    log.info(dbColor(`User with id ${userId} successfully deleted from DB`))
                } else {
                    res.json({
                        resultCode: 409, message: `Error, can\'t delete User with id ${userId} from DB`
                    })
                    log.info(errorColor(`Error, can\'t delete User with id ${userId} from DB`))
                }

            })
        } catch (err) {

            log.info(errorColor("Error: "), err)
        }
    }

    async read(req: Request, res: Response) {
        const getUser = async (req: any) => {
            log.info(req)
            if (req.params['my']) {
                return await User.findOne({_id: req.params.id}, 'likedAds')
                    .populate({
                        path: 'likedAds',
                        model: AdModel,
                        populate: {
                            path: 'author',
                            select: 'name phone'
                        }
                    })
                    .exec();
            } else {
                return await User.findOne({_id: req.params.id})
                    .populate({
                        path: 'ads',
                        model: AdModel,
                        populate: {
                            path: 'author',
                            select: 'name phone',
                        }
                    })
                    .populate('likedAds')
                    .exec();
            }
        }
        try {
            let user = await getUser(req);
            log.info(user);
            if (!user) {
                res.json({
                    resultCode: 409,
                    message: `User with id ${req.params.id} not found in DB`
                })
                log.info(errorColor(`User with id ${req.params.id} not found in DB`))
            } else {
                res.json({
                    resultCode: 201,
                    message: `User with id ${req.params.id} found successfully in DB`,
                    user
                })
                log.info(dbColor(`User with id ${req.params.id} found successfully in DB`))
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
