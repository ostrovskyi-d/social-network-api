import mongoose from 'mongoose';

const Schema = mongoose.Schema;

export interface UserInterface {
    name: string;
    phone?: string;
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
        github?: string;
        facebook?: string;
        instagram?: string;
    }
    photos?: {
        avatar?: string;
        background?: string
    }
}

const userSchema = new Schema<UserInterface>(
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
    {
        versionKey: false,
        timestamps: true,
        virtuals: true,
        toJSON: {
            transform: (_doc, ret) => {
                ret.id = ret._id;
                delete ret._id;
            },
        },
    }
);


export default mongoose.model<UserInterface>('User', userSchema);