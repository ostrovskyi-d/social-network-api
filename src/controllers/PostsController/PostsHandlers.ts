import PostModel from "../../models/PostModel";
import {getConfig} from '../../config';
import colors from "colors";
import log from "../../heplers/logger";

const {PER_PAGE}: any = getConfig();

const {
    brightCyan: dbColor,
    red: errorColor,
}: any = colors;

const getPostsFromFilters = async ({
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

    const selectedPostsCount = await PostModel.countDocuments(filterCondition);

    const posts = await PostModel
        .find(filterCondition)
        .skip(perPage * reqPage - perPage)
        .limit(+perPage)
        .populate({path: 'author', select: '-likedPosts'})
        .sort({createdAt: -1})
        .exec();

    const result = {
        posts: posts,
        totalPages: Math.ceil(selectedPostsCount / perPage),
        selectedAdsCount: selectedPostsCount,
    };

    log.info("selectedPostsCount: ", selectedPostsCount);
    log.info("perPage: ", perPage);
    log.info("totalPages: ", result.totalPages);
    return result;
}
const getPagedPostsHandler = async (pageQuery: any = 1) => {
    try {
        const perPage = +PER_PAGE;
        const reqPage = pageQuery || 1;
        const postsTotal = await PostModel.countDocuments({});
        const totalPages = Math.ceil(postsTotal / perPage);
        log.info(pageQuery);
        log.info(perPage * reqPage - perPage);
        const pagedPosts = await PostModel.find({})
            .skip(perPage * reqPage - perPage)
            .limit(+perPage)
            .populate({path: 'author', select: '-likedPosts'})
            .sort({createdAt: -1})
            .exec();

        return {
            message: `Posts successfully found`,
            posts: pagedPosts,
            postsTotal: postsTotal,
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


const saveNewPostToDatabase = async (post: any) => {
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
    getPagedPostsHandler,
    saveNewPostToDatabase,
    getPostsFromFilters,
}
