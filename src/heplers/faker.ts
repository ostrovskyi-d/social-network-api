import { faker } from '@faker-js/faker';
import UserModel from "../models/UserModel";
import PostModel from "../models/PostModel";

export const generateMockUsers = async (count: number) => {
    const users = [];

    for (let i = 0; i < count; i++) {
        users.push(new UserModel({
            name: faker.person.fullName(),
            email: faker.internet.email(),
            country: faker.location.country(),
            phone: faker.phone.number(),
            photos: {
                avatar: faker.image.avatar(),
                background: faker.image.urlPicsumPhotos(),
            },
            job: faker.person.jobTitle(),
            contacts: {
                linkedIn: faker.internet.url(),
                github: faker.internet.url(),
                facebook: faker.internet.url(),
                instagram: faker.internet.url(),
            },
        }));
    }

    await UserModel.insertMany(users);
    console.log(`${count} mock users inserted`);
};

export const generateMockPosts = async (count: number) => {
    const users = await UserModel.find({}, '_id');
    if (users.length === 0) {
        throw new Error('No users found');
    }

    const posts = [];

    for (let i = 0; i < count; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];

        posts.push(new PostModel({
            img: faker.image.urlPicsumPhotos(),
            title: faker.lorem.sentence({ min: 3, max: 8 }),
            author: randomUser._id,
            likes: {
                count: 0,
                users: []
            }
        }));
    }

    await PostModel.insertMany(posts);
    console.log(`${count} mock posts inserted`);
};
