import {UserInterface} from "../models/UserModel";

export const userMapping = (user: any = {}): UserInterface => {
    const contacts: any = {};
    if (user?.linkedIn) contacts.linkedIn = user.linkedIn;
    if (user?.github) contacts.github = user.github;
    if (user?.facebook) contacts.facebook = user.facebook;
    if (user?.instagram) contacts.instagram = user.instagram;

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
        contacts: contacts,
        photos: {
            avatar: user?.avatar || "",
            background: user?.background || "",
        },
    };
};
