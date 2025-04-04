export const userMapping = (user: any) => {
    return {
        name: user.name,
        email: user.email,
        // password: user.password,
        country: user.country,
        phone: user.phone,
        photos: {
            avatar: user.photos.avatar,
            background: user.photos.background,
        },
        job: user.job,
        likedPosts: user.likedPosts,
        posts: user.posts,
        followedBy: user.followedBy,
        following: user.following,
        contacts: {
            linkedIn: user.contacts.linkedIn,
            github: user.contacts.github,
            facebook: user.contacts.facebook,
            instagram: user.contacts.instagram,
        },
    }
}