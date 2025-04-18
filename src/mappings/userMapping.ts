import {UserInterface} from "../models/UserModel";

export const userMapping = (user: any = {}): UserInterface => {
    return {
        name: user?.name,
        phone: user?.phone,
        posts: user?.posts,
        likedPosts: user?.likedPosts,
        followedBy: user?.followedBy,
        following: user?.following,
        country: user?.country,
        job: user?.job,
        email: user?.email,
        password: user?.password,
        contacts: {
            linkedIn: user?.linkedIn || "",
            github: user?.github || "",
            facebook: user?.facebook || "",
            instagram: user?.instagram || "",
        },
        photos: {
            avatar: user?.avatar,
            background: user?.background,
        }
    }
}