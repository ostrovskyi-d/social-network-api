import Message from '../../models/MessageModel';
import log from "../../heplers/logger";

const findUserMessages = async (userId: any) => {
    const userMessages = await Message.find({user: userId}).exec();
    log.info(`User messages: ${JSON.stringify(userMessages)}`);
    return userMessages;
}

const saveUserMessage = async (message: Object) => {
    const savedMessage = await Message.create(message);
    log.info('Message successfully saved to DB');
    return savedMessage;
}

const deleteUserMessage = async (userId: any, message: any) => {
    Message.deleteOne({userId, message});
    log.info('Message successfully deleted from DB');
}


export default {
    findUserMessages,
    saveUserMessage,
    deleteUserMessage,
}