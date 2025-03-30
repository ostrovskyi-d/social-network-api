import mongoose, {Schema} from "mongoose";

const conversationSchema = new Schema({
    conversationId: {type: Schema.Types.ObjectId},
    members: {
        type: [
            {type: Schema.Types.ObjectId, ref: 'User'},
            {type: Schema.Types.ObjectId, ref: 'User'}
        ]
    },
    text: {type: String}
}, {timestamps: true});

export default mongoose.model("Conversation", conversationSchema);
