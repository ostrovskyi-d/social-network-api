import AdModel from "../../models/AdModel";
import {getConfig} from '../../config';
import colors from "colors";
import log from "../../heplers/logger";

const {PER_PAGE}: any = getConfig();

const {
    brightCyan: dbColor,
    red: errorColor,
}: any = colors;

const getAdsFromFilters = async ({selectedCategories, selectedSubCategories, perPage, reqPage}: any) => {
    const commonFilterQuery = [
        {categoryId: {$in: selectedCategories}},
        {subCategoryId: {$in: selectedSubCategories}}
    ];

    const filterCondition =
        selectedCategories.length && selectedSubCategories.length
            ? {$and: commonFilterQuery}
            : {$or: commonFilterQuery};

    const selectedAdsCount = await AdModel.count(filterCondition);

    const ads = await AdModel
        .find(filterCondition)
        .skip(perPage * reqPage - perPage)
        .limit(+perPage)
        .populate({path: 'author', select: '-likedAds'})
        .sort({createdAt: -1})
        .exec();

    const result = {
        ads: ads,
        totalPages: Math.ceil(selectedAdsCount / perPage),
        selectedAdsCount: selectedAdsCount,
    };

    log.info("selectedAdsCount: ", selectedAdsCount);
    log.info("perPage: ", perPage);
    log.info("totalPages: ", result.totalPages);
    return result;
}
const getPagedAdsHandler = async (pageQuery: any = 1) => {
    try {
        const perPage = +PER_PAGE;
        const reqPage = pageQuery || 1;
        const adsTotalPromise = await AdModel.count({});
        const adsTotal = await adsTotalPromise;
        const totalPages = Math.ceil(adsTotal / perPage);
        log.info(pageQuery);
        log.info(perPage * reqPage - perPage);
        const pagedAds = await AdModel.find({})
            .skip(perPage * reqPage - perPage)
            .limit(+perPage)
            .populate({path: 'author', select: '-likedAds'})
            .sort({createdAt: -1})
            .exec();

        return {
            message: `Ads successfully found`,
            ads: pagedAds,
            adsTotal,
            totalPages,
            perPage,
            currentPage: reqPage
        };

    } catch (err: any) {
        log.info(errorColor(err));
        return {
            message: err.message || 'Unknown error',
        }
    }
}


const saveNewAdToDatabase = async (ad: any) => {
    try {
        const savedAd: any = await ad.save();
        if (savedAd) {
            log.info(dbColor(`Ad with id ${ad._id} successfully saved to DB`))
            return {
                message: `Ad with id ${ad._id} successfully saved to DB`,
                ad
            }
        }
    } catch (err: any) {
        log.info(errorColor(err))
        return {
            message: "Error: " + err.message,
        }
    }
}

export {
    getPagedAdsHandler,
    saveNewAdToDatabase,
    getAdsFromFilters,
}
