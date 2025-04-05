import User from "../../models/UserModel";

const updatePostOwner = async (post: any, postOwner: any) => {
    try {
        const user = await User.findOneAndUpdate(
            {_id: postOwner},
            {"$addToSet": {posts: post}}
        );

        if (!user) {
            return {
                message: `Requested author doesn\'t exist {_id: ${postOwner}}... You shall not pass!`
            }
        } else {
            return {
                message: `Requested author (id: ${postOwner}) successfully updated with a new ad (id: ${post._id})`,
            }
        }
    } catch (err) {
        return {
            message: "Server error... Please, try again later"
        }
    }
}
export {
    updatePostOwner
}
