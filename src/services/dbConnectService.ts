import mongoose from 'mongoose';
import colors from "colors";
import log from "../heplers/logger";

const {brightCyan: dbColor, red: errorColor}: any = colors;

const connectToDB = async (mongoURI: any) => {
    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        });
        if (mongoose.connection.readyState === 1) {
            log.info(`Database connected: ${mongoURI}` );
        }
    } catch (error) {
        log.error(errorColor("--app MongoURI: ", mongoURI));
        log.error(errorColor("--app: connectToDB catch: " + error));
        log.error(errorColor("--app: Cannot connect to db, please try to connect local db."));
    }

    mongoose.connection.on('error', err => log.error(err));
    mongoose.connection.on('connected', () => log.info('Connected'));
}

export default connectToDB;
