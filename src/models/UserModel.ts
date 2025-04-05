import mongoose from 'mongoose';

const Schema = mongoose.Schema;

interface User {
    name: string;
    phone?: string;
    avatar?: string;
    posts?: Array<string>,
    likedPosts?: Array<string>,
    followedBy?: Array<string>,
    following?: Array<string>,
    country?: string,
    job?: string,
    email: string;
    password: string;
    contacts?: {
        linkedIn?: string,
    }
}

const userSchema = new Schema<User>(
    {
        name: {type: String, required: true,},
        email: {type: String, required: true, unique: true},
        password: {type: String, required: true, select: false},
        country: {type: String},
        phone: {type: String},
        photos: {
            avatar: {type: String},
            background: {type: String},
        },
        job: {type: String},
        likedPosts: [{type: Schema.Types.ObjectId, ref: 'Post'}],
        posts: [{type: Schema.Types.ObjectId, ref: 'Post'}],
        followedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
        following: [{type: Schema.Types.ObjectId, ref: 'User'}],
        contacts: {
            linkedIn: {type: String, unique: true},
            github: {type: String, unique: true},
            facebook: {type: String, unique: true},
            instagram: {type: String, unique: true},
        },
    },
    {versionKey: false},
    // @ts-ignore
    {timestamps: true},
);


export default mongoose.model<User>('User', userSchema);