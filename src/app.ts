import {getConfig} from './config';
import colors from 'colors';
import express, {Request, Response} from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from "multer";
import morgan from 'morgan';
import {createServer} from "http";
import {Server, Socket} from "socket.io";
import log from "./heplers/logger";
import AdsController from "./controllers/AdsController/AdsController";
import UserController from "./controllers/UserController/UserController";
import ChatController from "./controllers/ChatController/ChatController";
import jwt from './services/authService';
import connectToDB from "./services/dbConnectService";


const {brightGreen: serverColor}: any = colors;
const config = getConfig();
const app = express();
const storage = multer.memoryStorage();
const upload = multer({storage});
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
    }
});

const User = new UserController();
const Ad = new AdsController();
const Chat = new ChatController(io).init();

app.use(morgan('combined'));
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
config.AUTH.isActive && app.use(jwt());
app.use(express.static('./uploads'));
app.use('/uploads', express.static('./uploads'));

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to GEBO app!',
    })
});

app.get('/ads?:page', Ad.index);
app.get('/ads/:id', Ad.read);
app.post('/ads', upload.single('img'), Ad.create);
app.put('/ads/:id', upload.single('img'), Ad.update);
app.delete('/ads/:id', Ad.delete);
app.delete('/clear-ads', Ad._clearAdsCollection);

app.get('/users', User.index);
app.get('/users/:id?/:my?', User.read);
app.post('/add-new-user', upload.single('avatar'), User.create);
app.put('/toggle-like-ad', User.update);
app.put('/user', upload.single('avatar'), User.update)
app.delete('/users', User.delete);
app.delete('/clear-users', User._clearUsersCollection);

app.post('/conversation', Chat.initConversation);
app.get('/conversation/:userId', Chat.getUserConversation);

app.post('/upload', (req: Request, res: Response) => {
    if (req.files) {
        res.send('Successfully uploaded ' + req.files.length + ' files!')
    } else {
        res.send('No files selected')
    }
})

const start = async () => {
    log.info(serverColor('--app Server is staring...'))

    const PORT = config.SERVER.PORT;
    const MONGO_URI = config.MONGO.MONGO_URI;

    await connectToDB(MONGO_URI);
    await httpServer.listen(PORT, () => {
        log.info(serverColor(`--app Server listening at http://localhost:${PORT}`))
    })
}

start();
