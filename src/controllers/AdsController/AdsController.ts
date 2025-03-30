import AdModel from "../../models/AdModel";
import colors from "colors";
import UserModel from "../../models/UserModel";
import {getUserIdByToken} from "../../services/authService";
import {getConfig} from "../../config";
import {uploadFile} from "../../services/uploadService";
import {getAdsFromFilters, getPagedAdsHandler, saveNewAdToDatabase} from "./AdsHandlers";
import {updateAdOwner} from "../UserController/UserHandlers";
import {Request, Response} from 'express';
import log from "../../heplers/logger";

const {
    brightCyan: dbColor,
    red: errorColor,
}: any = colors;

const {PER_PAGE, S3: {S3_PATH}} = getConfig();

class AdsController {

    async index(req: Request, res: Response) {
        log.info('-- AdsController method ".index" called --');
        log.info(`query: ${JSON.stringify(req?.query)}`);

        const reqPage = Number(req.query['page']);

        if (!req.query['page']) {
            const result = await getPagedAdsHandler();
            log.info(`response: ${JSON.stringify(result)}`);

            res.json(result);
        } else {
            const result = await getPagedAdsHandler(reqPage);
            log.info(`response: ${JSON.stringify(result)}`);

            if (!result) {
                return res.status(404).json({
                    message: `Error. Can't handle ads at page №: ${+req.query['page']}`,
                    ads: result
                })
            } else {
                return res.json(result)
            }
        }
    }

    async create(req: Request, res: Response) {
        log.info('-- AdsController method ".create" called --');

        const {file, body, query, headers: {authorization: auth}} = req || {};
        const {
            name,
            description,
            categoryId,
            subCategoryId,
            selectedCategories,
            selectedSubCategories
        } = body || {};
        const {author}: any = await getUserIdByToken(auth);
        const perPage = Number(PER_PAGE);
        const reqPage = Number(query['page']) || 1;
        const adsTotalPromise = await AdModel.count({});
        const adsTotal = await adsTotalPromise;
        // const totalPages = Math.ceil(adsTotal / perPage);

        file && await uploadFile(file);

        // Create Ad
        const ad = new AdModel({
            name: name || 'Оголошення',
            img: file ? S3_PATH + file.originalname : '',
            description: description || 'test ad description11',
            author: author,
            categoryId: categoryId || '1',
            subCategoryId: subCategoryId || '1'
        });

        // Return ads
        // return ads that matches selected categories
        if (selectedCategories || selectedSubCategories) {
            if (!selectedCategories.length && !selectedSubCategories.length) {
                if (!reqPage) {
                    const result = await getPagedAdsHandler();
                    res.json(result);
                } else {
                    const result = await getPagedAdsHandler(reqPage);

                    if (!result) {
                        return res.status(404).json({
                            message: `Error. Can't handle ads at page №: ${reqPage}`,
                            ads: result
                        })
                    } else {
                        return res.json(result)
                    }
                }
            } else {

                const {totalPages, ads, selectedAdsCount} = await getAdsFromFilters({
                    selectedCategories,
                    selectedSubCategories,
                    perPage,
                    reqPage
                });

                // log.info(dbColor(result));
                return res.json({
                    message: `Ads successfully found`,
                    ads: ads,
                    adsTotal: selectedAdsCount,
                    totalPages: totalPages,
                    perPage,
                    currentPage: reqPage,
                });
            }
        } else {
            // Save new ad
            const savedAd = await saveNewAdToDatabase(ad);
            if (!!savedAd) {
                // Update user with ref to this ad
                await updateAdOwner(ad, author);
                return res.json(savedAd)
            }
        }
    }

    async read(req: Request, res: Response) {
        log.info('-- AdsController method ".read" called --');

        await AdModel.findOne({_id: req.params.id}).populate({
            path: 'author',
            select: '-likedAds'
        }).then((ad: any) => {
            if (!ad) {
                res.json({
                    resultCode: res.statusCode,
                    message: `Ad with id ${req.params.id} not found in DB`,
                })
                log.info(errorColor(`Ad with id ${req.params.id} not found in DB`))
            } else {
                res.json({
                    resultCode: res.statusCode,
                    message: `Ad with id ${req.params.id} found successfully in DB`,
                    ad
                })
                log.info(dbColor(`Ad with id ${req.params.id} found successfully in DB`))
            }
        })
    }

    async update(req: Request, res: Response) {
        log.info('-- AdsController method ".update" called --');
        const {params} = req || {};
        const paramsId = params.id;
        let file;

        if (req.file) {
            file = await uploadFile(req.file);
        }

        await AdModel.findByIdAndUpdate(paramsId, {
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
                log.info(errorColor(`Error, cannot update Ad with id ${req.params.id}: `), err)
            } else {
                res.json({
                    resultCode: res.statusCode,
                    message: `Ad with id ${req.params.id} is successfully updated`
                })
                log.info(dbColor(`Ad with id ${req.params.id} is successfully updated`, req.body))
            }
        })
    }

    async delete(req: Request, res: Response) {
        log.info('-- AdsController method ".delete" called --');

        const {author: userId}: any = await getUserIdByToken(req.headers.authorization);
        const deletedAd = await AdModel.findByIdAndDelete(req.params.id).exec();
        log.info("Deleted Ad: ", deletedAd);
        await UserModel.updateMany({}, {$pull: {likedAds: req.params.id, ads: req.params.id}});
        const userAds = await UserModel.findById(userId, {ads: '$ads'}).populate('ads');

        if (userAds) {
            res.json({
                resultCode: 201,
                message: `Ad with id ${req.params.id} successfully deleted from DB`,
                ads: userAds
            })
            log.info(dbColor(`Ad with id ${req.params.id} successfully deleted from DB`))
        } else {
            res.json({
                resultCode: 409,
                message: `Error, can\'t delete Ad with id ${req.params.id} from DB`
            })
            log.info(errorColor(`Error, can\'t delete Ad with id ${req.params.id} from DB`))
        }

    }

    async _clearAdsCollection(req: Request, res: Response) {
        log.info('-- AdsController method "._clearAdsCollection" called --');

        await AdModel.deleteMany({}, (ads: any) => {
            res.json({
                ads,
                message: "ONLY FOR DEV ENV: All ads successfully removed from db. Also removed ads links in categories"
            })
        });
    }
}

export default AdsController;
