import mongoose from 'mongoose';
import moment from "moment";

const getLocalizedDate = () => moment().locale('us');

const Schema = mongoose.Schema;

interface Post {
    img?: string;
    title?: string;
    author: Object;
    date: string;
    likes: {
        count: number;
        users: Array<String>
    }
}

const postSchema = new Schema<Post>({
        img: {type: String, default: ''},
        title: {type: String},
        author: {type: Schema.Types.ObjectId, ref: 'User',},
        date: {type: String, default: getLocalizedDate().format('DD MMMM, HH:mm')},
        likes: {
            count: {type: Number, default: 0},
            users: [{type: Schema.Types.ObjectId, ref: 'User'}]
        }
    },
    {
        timestamps: true,
        versionKey: false,
        virtuals: true,
        toJSON: {
            transform: (_doc, ret) => {
                ret.id = ret._id;
                delete ret._id;
            },
        },
    },
)

export default mongoose.model<Post>('Post', postSchema);
