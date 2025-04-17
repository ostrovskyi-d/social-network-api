import PostModel from "../../models/PostModel";
import colors from "colors";
import log from "../../heplers/logger";
import {errorTypes} from "../../consts/errorTypes";
import {NotFoundError} from "../../services/errorService";


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
const getPagedPostsHandler = async (body: any = 1) => {
    const perPage = Number(body['count']) || 10;
    const reqPage = Math.max(Number(body['page']) || 1, 1);
    const searchQuery = body['search'] ? String(body['search']) : null;
    const filter: any = {};

    // todo: fix, not working
    if (searchQuery) {
        filter.title = {$regex: searchQuery, $options: 'i'};
    }

    const postsTotal = await PostModel.countDocuments(filter);
    const totalPages = Math.ceil(postsTotal / perPage);

    const pagedPosts = await PostModel.find(filter)
        .skip(perPage * reqPage - perPage)
        .limit(+perPage)
        // .populate({path: 'author', select: '-likedPosts'})
        .sort({createdAt: -1})

    if (!pagedPosts.length) {
        throw new NotFoundError('Posts were not found');
    }

    return {
        message: `Posts were successfully found`,
        data: {
            postsTotal: postsTotal,
            totalPages,
            perPage,
            currentPage: reqPage,
            posts: pagedPosts,
        }
    };
}


const saveNewPostToDatabase = async (post: any) => {
    try {
        const savedPost: any = await post.save();
        if (savedPost) {
            log.info(dbColor(`Post with id ${post._id} successfully saved to DB`))
            return {
                message: `Post with id ${post._id} successfully saved to DB`,
                data: post
            }
        }
    } catch (err: any) {
        log.info(errorColor(err))
        return {
            errorType: errorTypes.ServerError,
            message: "Error: " + err.message,
        }
    }
}

export {
    getPagedPostsHandler,
    saveNewPostToDatabase,
    getPostsFromFilters,
}
