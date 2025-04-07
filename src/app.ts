import {getConfig} from './config';
import colors from 'colors';
import express from 'express';
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

const {brightGreen: apiColor}: any = colors;
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

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Social Network API! It Works!',
    })
});

// IMPORTANT: keep order of routes
// get posts list paginated
app.get('/posts?:page', Post.index);
// get post by id
app.get('/posts/:id', Post.read);
// create new post
app.post('/posts', upload.single('img'), Post.create);
// @ts-ignore
// post like-dislike - toggle logic
app.put('/posts/like', Post.like);
// update post by id
app.put('/posts/:id', upload.single('img'), Post.update);
// delete post by id
app.delete('/posts/:id', Post.delete);
// DELETE ALL POSTS
app.delete('/clear-posts', Post._clearPostsCollection);

// get list of users (paginated)
app.get('/users', User.index);
// update profile
app.put('/user', upload.fields([
    {name: 'avatar', maxCount: 1},
    {name: 'background', maxCount: 1}
]), User.update);
// get token owner profile
app.get('/user/me', User.readMy);
// get user profile by id
app.get('/user/:id', User.readById);
// get current user brief data (from token)
app.get('/auth/me', User.auth);
// authorize user using email and password, returns token
// create user - kind of registration logic
// @ts-ignore
app.post('/auth/register', upload.single('avatar'), User.create);
// @ts-ignore
app.post('/auth/login', User.login);

// delete user
app.delete('/users', User.delete);
// DELETE ALL USER
app.delete('/clear-users', User._clearUsersCollection);

// chat functionality (in development)
app.post('/conversation', Chat.initConversation);
app.get('/conversation/:userId', Chat.getUserConversation);

const start = async () => {
    log.info(apiColor('--app Server is staring...'))

    const PORT = config.SERVER.PORT;
    const MONGO_URI = config.MONGO.MONGO_URI;

    console.log('MONGO_URI: ', MONGO_URI);

    await connectToDB(MONGO_URI);

    httpServer.listen(PORT, () => {
        log.info(apiColor(`--app Server listening at http://localhost:${PORT}`))
    })
}

start();
