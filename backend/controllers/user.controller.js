import User from "../models/user.model.js";
import {v2 as cloudinary} from "cloudinary";
import Notification from "../models/notification.model.js";
import bcrypt from "bcryptjs/dist/bcrypt.js";

export const getUserProfile = async (req,res) => {
    const {username} = req.params;
    try{
        const user = await User.findOne({username}).select("-password");
        if(!user) {
            return res.status(404).json({error: "User not found"});
        }
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfile controller", error.message);
        res.status(500).json({error: error.message});
    }
};

export const followUnfollowUser = async (req,res) => {
    try {
        const {id} = req.params;
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);
        if(id === req.user._id.toString()) {
            return res.status(400).json({error: "You cannot follow/unfollow yourself"});
        } 
        if(!userToModify || !currentUser) {
            return res.status(400).json({error: "User not found"});
        }
        const isFollowing = currentUser.following.includes(id);
        if(isFollowing) {
            // unfollow the user
            await User.findByIdAndUpdate(id, {$pull: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, {$pull: {following: id}});
            res.status(200).json({message: "User unfollowed successfully"});
        } else {
            // follow the user
            await User.findByIdAndUpdate(id,{$push: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, {$push: {following: id}});
            // send notification to the user
            const newNNotification = new Notification({
                type: "follow",
                from: req.user._id,
                to: userToModify._id,
            });
            await newNNotification.save();
            res.status(200).json({message: "User followed successfully"});

        }
    } catch (error) {
        console.log("Error in followUnfollowUser controller", error.message);
        res.status(500).json({error: error.message});
    }
};

export const getSuggestedUser = async (req,res) =>  {
    try {
        const userId = req.user._id;

        const usersFollowedByMe = await User.findById(userId).select("following");

        const users = await User.aggregate([
            {
                $match: {
                    _id: {$ne: userId}
                }
            },
            {$sample: {size:10}}
        ]);
        const filteredUsers = users.filter(user =>!usersFollowedByMe.following.includes(user._id));
        const suggestedUsers = filteredUsers.slice(0,4);
        suggestedUsers.forEach(user => user.password = null);
        res.status(200).json(suggestedUsers);
    } catch (error) {
        console.log("Error in getSuggestedUser controller", error.message);
        res.status(500).json({error: error.message});
    }
}

export const updateUser = async(req,res) => {
    const {fullName, email, username, currentPassword, newPassword, bio, link} = req.body;
    let {profileImg, coverImg} = req.body;

    const userId = req.user._id;

    try {
         let user = await User.findById(userId);
         if(!user) return res.status(404).json({message: "User not found"});

         if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: "Please provide your current password to set a new one." });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if(!isMatch) {
                return res.status(400).json({error: "Current password is incorrect"});
            }

            if(newPassword.length < 6) {
                return res.status(400).json({error: "Password must be at least 6 characters long"});    
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        if(profileImg) {
            if(user.profileImg) {

                await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
            }
            const uploadedResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadedResponse.secure_url;
        }
        if(coverImg) {
            if(user.coverImg) {

                await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
            }
            const uploadedResponse = await cloudinary.uploader.upload(coverImg);
            coverImg = uploadedResponse.secure_url;
        }
        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.username = username || user.username;
        user.bio = bio || user.bio;
        user.link = link || user.link;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;

        await user.save();
        user.password = null;
        return res.status(200).json(user);
    } catch(error) {
        console.log("Error in updateUser controller", error.message);
        res.status(500).json({error: error.message});
    }
};

export const searchUsers = async (req, res) => {
    const { query } = req.query;
  
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
  
    try {
      const regex = new RegExp(query, "i"); // Case-insensitive search
  
      const users = await User.find({
        $or: [{ username: regex }, { fullName: regex }],
      }).select("username fullName _id");
  
      res.status(200).json(users);
    } catch (error) {
      console.error("Error in searchUsers controller", error.message);
      res.status(500).json({ error: "Server error" });
    }
};

export const removeProfileImage = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
  
      if (!user) return res.status(404).json({ error: "User not found" });
  
      // Remove image from Cloudinary
      if (user.profileImg) {
        const publicId = user.profileImg.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
  
      user.profileImg = "";
      await user.save();
  
      res.status(200).json({ message: "Profile image removed successfully" });
    } catch (error) {
      console.error("Error in removeProfileImage:", error.message);
      res.status(500).json({ error: "Failed to remove profile image" });
    }
};
  
export const removeCoverImage = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
  
      if (!user) return res.status(404).json({ error: "User not found" });
  
      // Remove image from Cloudinary
      if (user.coverImg) {
        const publicId = user.coverImg.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }
  
      user.coverImg = "";
      await user.save();
  
      res.status(200).json({ message: "Cover image removed successfully" });
    } catch (error) {
      console.error("Error in removeCoverImage:", error.message);
      res.status(500).json({ error: "Failed to remove cover image" });
    }
};
  