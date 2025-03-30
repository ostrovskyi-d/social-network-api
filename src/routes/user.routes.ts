import {Router} from 'express';
import {
    createUser,
    deleteUser,
    getUser,
    getUsers,
    updateUser,
} from '../controllers/user.controller';

const userRoute = Router();

userRoute.post('', createUser);
userRoute.get('', getUsers);
userRoute.get('/:userid', getUser);
// @ts-ignore
userRoute.delete('/:userid', deleteUser);
// @ts-ignore
userRoute.patch('/:userid', updateUser);


export default userRoute;
