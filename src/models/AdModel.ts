import mongoose from 'mongoose';
import moment from "moment";

const getLocalizedDate = () => moment().locale('uk');

const Schema = mongoose.Schema;

const adSchema = new Schema({
        img: {type: String, default: ''},
        name: {type: String},
        description: {type: String},
        author: {type: Schema.Types.ObjectId, ref: 'User',},
        categoryId: {
            type: String,
        },
        subCategoryId: {
            type: String,
        },
        date: {type: String, default: getLocalizedDate().format('DD MMMM, HH:mm')},
    },
    {
        timestamps: true,
        versionKey: false
    },
)

export default mongoose.model('Ad', adSchema);
