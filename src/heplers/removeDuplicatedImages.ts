import UserModel from "../models/UserModel";

export const removeDuplicatedImages= async () => {
    let userPhotos: Array<any> = [];
    const users = await UserModel.find({});
    users.forEach(user => {
        userPhotos.push({
            id: user._id.toString(),
            ...user.photos,
        })
    })

    function getDuplicatesOnly(users: any) {
        const avatarCount: any = {};
        const backgroundCount: any = {};

        // Count appearances
        for (const user of users) {
            avatarCount[user.avatar] = (avatarCount[user.avatar] || 0) + 1;
            backgroundCount[user.background] = (backgroundCount[user.background] || 0) + 1;
        }

        // Filter users who have duplicated avatar or background
        return users.filter((user: any) =>
            avatarCount[user.avatar] > 1 || backgroundCount[user.background] > 1
        );
    }

    const duplicatedUsers = getDuplicatesOnly(userPhotos);
    console.log(duplicatedUsers);

    const updatedUser = await UserModel.findByIdAndUpdate(duplicatedUsers[0].id, {'photos.avatar': '', 'photos.background': ''})

    console.log(updatedUser);
}
