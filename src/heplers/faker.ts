import { faker } from '@faker-js/faker';
import UserModel from "../models/UserModel";

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

