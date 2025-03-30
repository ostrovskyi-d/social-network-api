import User from "../../models/UserModel";

const updateAdOwner = async (ad: any, adOwner: any) => {
    try {
        const user = await User.findOneAndUpdate(
            {_id: adOwner},
            {"$addToSet": {ads: ad}}
        );

        if (!user) {
            return {
                message: `Requested author doesn\'t exist {_id: ${adOwner}}... You shall not pass!`
            }
        } else {
            return {
                message: `Requested author (id: ${adOwner}) successfully updated with a new ad (id: ${ad._id})`,
            }
        }
    } catch (err) {
        return {
            message: "Server error... Please, try again later"
        }
    }
}
export {
    updateAdOwner
}
