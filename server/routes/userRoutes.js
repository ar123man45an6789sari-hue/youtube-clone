import express from "express";
import { getUsers, createUser } from "../controllers/userController.js";

const router = express.Router();

router.route("/").get(getUsers).post(createUser);


router.put('/users/:id', async (req, res) => {
  try {
    const { password } = req.body;
    

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;