import PostModel from "../../models/PostModel";
import {getConfig} from '../../config';
import colors from "colors";
import log from "../../heplers/logger";

const {PER_PAGE}: any = getConfig();

const {
    brightCyan: dbColor,
    red: errorColor,
}: any = colors;

const getAdsFromFilters = async ({
                                     selectedCategories,
                                     selectedSubCategories,
                                     perPage,
                                     reqPage
                                 }: any
) => {
    const commonFilterQuery = [
        {categoryId: {$in: selectedCategories}},
        {subCategoryId: {$in: selectedSubCategories}}
    ];

    const filterCondition =
        selectedCategories.length && selectedSubCategories.length
            ? {$and: commonFilterQuery}
            : {$or: commonFilterQuery};

    const selectedAdsCount = await PostModel.countDocuments(filterCondition);

    const posts = await PostModel
        .find(filterCondition)
        .skip(perPage * reqPage - perPage)
        .limit(+perPage)
        .populate({path: 'author', select: '-likedAds'})
        .sort({createdAt: -1})
        .exec();

    const result = {
        posts: posts,
        totalPages: Math.ceil(selectedAdsCount / perPage),
        selectedAdsCount: selectedAdsCount,
    };

    log.info("selectedPostsCount: ", selectedAdsCount);
    log.info("perPage: ", perPage);
    log.info("totalPages: ", result.totalPages);
    return result;
}
const getPagedAdsHandler = async (pageQuery: any = 1) => {
    try {
        const perPage = +PER_PAGE;
        const reqPage = pageQuery || 1;
        const postsTotal = await PostModel.countDocuments({});
        const totalPages = Math.ceil(postsTotal / perPage);
        log.info(pageQuery);
        log.info(perPage * reqPage - perPage);
        const pagedAds = await PostModel.find({})
            .skip(perPage * reqPage - perPage)
            .limit(+perPage)
            .populate({path: 'author', select: '-likedPosts'})
            .sort({createdAt: -1})
            .exec();

        return {
            message: `Posts successfully found`,
            ads: pagedAds,
            adsTotal: postsTotal,
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


const saveNewAdToDatabase = async (post: any) => {
    try {
        const savedPost: any = await post.save();
        if (savedPost) {
            log.info(dbColor(`Post with id ${post._id} successfully saved to DB`))
            return {
                message: `Post with id ${post._id} successfully saved to DB`,
                post
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
