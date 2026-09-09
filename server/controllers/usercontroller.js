import User from "../models/User.js";

// Saare users ko database se lana
const getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Naya user database mein save karna
const createUser = async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// save the user's theme preference (auto or manual)
const updateUserTheme = async (req, res) => {
  try {
    const { theme, themeAuto } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme, themeAuto },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { getUsers, createUser, updateUserTheme };