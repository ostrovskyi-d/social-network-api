import {getConfig} from './config';
import colors from 'colors';
import express, {Request, Response} from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from "multer";
import morgan from 'morgan';
import {createServer} from "http";
import {Server} from "socket.io";
import log from "./heplers/logger";
import PostsController from "./controllers/PostsController/PostsController";
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
const Post = new PostsController();
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
        message: 'Welcome to Social Network API!',
    })
});


app.get('/posts?:page', Post.index);
app.get('/posts/:id', Post.read);
app.post('/posts', upload.single('img'), Post.create);
app.put('/posts/:id', upload.single('img'), Post.update);
app.delete('/posts/:id', Post.delete);
app.delete('/clear-posts', Post._clearPostsCollection);

app.get('/users', User.index);
app.get('/auth/me', User.auth);
// @ts-ignore
app.post('/auth/login', User.login);

app.get('/users/:id?/:my?', User.read);
// @ts-ignore
app.post('/users', upload.single('avatar'), User.create);
app.put('/toggle-like-post', User.update);
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

    httpServer.listen(PORT, () => {
        log.info(serverColor(`--app Server listening at http://localhost:${PORT}`))
    })
}

start();
