import dotenv from 'dotenv';
import path from 'path';
import log from "../heplers/logger";
import local from './local';
import dev from './dev';
import stg from './stg';
import prod from './prod';

let _dirname = path.resolve(path.dirname(''));

const root = path.join.bind(this, _dirname);
dotenv.config({path: root('.env')});

let config: Object = {};

const initConfig: VoidFunction = () => {
    const env = process.env.NODE_ENV;

    switch (env) {
        case 'local':
            config = local(process.env);
            break;
        case 'development':
            config = dev(process.env);
            break;
        case 'staging':
            config = stg(process.env);
            break;
        case 'production':
            config = prod(process.env);
            break;

        default:
            log.info(`No environment variable found, default "${env}" used`);
            config = {...dev};
            break;
    }

    log.info(`Environment set to ${env}`);
};

export const getConfig: Function = () => {
    if (!config || !Object.keys(config).length) {
        log.error('No configuration initialized');
        return null;
    } else {
        console.log()
        return config;
    }
};

if (!config || !Object.keys(config).length) {
    initConfig();
}
