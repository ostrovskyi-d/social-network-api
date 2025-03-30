import { Router } from 'express';
import userRoute from './user.routes';
// Index
const indexRoute = Router();
indexRoute.get('', async (req, res) => {
    res.json({ message: 'Welcome User' });
});
indexRoute.use('/users', userRoute);
export default indexRoute;