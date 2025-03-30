import {Server, Socket} from 'socket.io';
import log from "../../heplers/logger";
import {DefaultEventsMap} from "socket.io/dist/typed-events";
import EVENTS from '../../consts/ioEvents';
import chatHandlers from "./ChatHandlers";
import Conversation from "../../models/Conversation";
import {Request, Response} from "express";
import MessageModel from "../../models/MessageModel";

let ioSocket: Socket;

class ChatController {
    private readonly io: Server<DefaultEventsMap, DefaultEventsMap>;
    private id: any | null;
    static initConversation: Function;

    constructor(io: Server<DefaultEventsMap, DefaultEventsMap>) {
        this.io = io;
        this.id = null;
    }

    public initConversation = async (req: Request, res: Response) => {
        log.info(`ChatController.getUserConversation() called with body ${JSON.stringify(req.body)}`)
        const {body} = req;
        const {senderId, receiverId}: any = body;

        const newConversation = new Conversation({
            members: [senderId, receiverId]
        });

        try {
            const savedConversation = await newConversation.save();
            log.info('Conversation saved successfully')
            res.status(200).json(savedConversation);
        } catch (err) {
            res.status(500).json(err);
        }
    };

    public getUserConversation = async (req: Request, res: Response) => {
        log.info(`ChatController.getUserConversation() called with params ${req.params.userId}`)
        try {
            const conversation = await Conversation.find({
                members: {$in: [req.params.userId]}
            });
            const messages = await MessageModel.find({
                conversation: conversation._id,
            })
            if(!conversation) {
                res.json({message: 'conversation not found'})
            }

            res.status(200).json({conversation, messages});
        } catch (err) {
            res.status(500).json(err)
        }
    }

    public init = () => {

        this.io.on(EVENTS.CONNECTION, (socket: Socket) => {
            ioSocket = socket;
            this.id = socket.handshake.query.id;
            socket.join(this.id);
            this._useSocketListeners();

            log.info(`Client connected:: handshake.query.id = ${this.id}  `);
        })

        return this;
    }
    // //
    private _useSocketListeners = () => this._withSocket(async (socket: Socket) => {
        if (socket) {
            socket.emit(EVENTS.SUCCESS, await chatHandlers.findUserMessages(this.id));

            socket.on(EVENTS.MESSAGE_ADD, this.onMessage);
            socket.on(EVENTS.TYPING, this.onTyping);


            socket.on(EVENTS.DISCONNECT, this.onDisconnect);
        }
    });
    //
    private _withSocket = (cb: Function) => ioSocket ? cb(ioSocket) : null;
    //
    private onTyping = () => this._withSocket((socket: Socket) => {
        log.info('User is typing message...');

        socket.emit(EVENTS.TYPING, 'User is typing message...');
    })
    //
    private onMessage = (message: Object) => this._withSocket(async (socket: Socket) => {
        log.info(`User sent message: ${JSON.stringify(message)}`);
        try {
            const {content: text}: any = message;
            await chatHandlers.saveUserMessage({sender: '61fae6b0df335c3d9023d166', text});

            socket.emit(EVENTS.MESSAGES, message)
        } catch (err) {
            log.error(`Something went wrong on saving message: ${JSON.stringify(message)} \n ERROR: ${JSON.stringify(err)}`);
        }
    })
    //
    private onDisconnect = () => this._withSocket((socket: Socket) => {
        log.info('Socket disconnected by user');

        socket.disconnect();
        // this.io.close();
    });
}

export default ChatController;
