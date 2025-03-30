import mongoose from 'mongoose';

const Schema = mongoose.Schema;

interface User {
    name: string;
    phone?: string;
    avatar?: string;
    posts?: Array<string>
}

const userSchema = new Schema<User>(
    {
        name: {type: String, required: true,},
        phone: {type: String},
        avatar: {type: String},
        likedAds: [{type: Schema.Types.ObjectId, ref: 'Post'}],
        posts: [{type: Schema.Types.ObjectId, ref: 'Post'}],
    },
    {versionKey: false},
    // @ts-ignore
    {timestamps: true},
);


export default mongoose.model<User>('User', userSchema);