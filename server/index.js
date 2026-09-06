import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Apne routes ko import kar (agar folder ka naam alag hai toh path change kar lena)
import connectDB from './db.js'; 
import userRoutes from './routes/userRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/comments", commentRoutes);

// 🔥 BULLETPROOF PASSWORD RESET ROUTE (Directly in index.js) 🔥
let User;
try { 
  const mod1 = await import("./models/User.js");
  User = mod1.default || mod1;
} catch (e) {
  try { 
    const mod2 = await import("./Modals/User.js");
    User = mod2.default || mod2;
  } catch (e2) {
    console.log("⚠️ Could not find User model for password reset route.");
  }
}

if (User) {
  app.put("/api/users/:id", async (req, res) => {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { password: req.body.password },
        { new: true }
      );
      
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      res.json({ success: true, data: updatedUser });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
}

app.get("/", (req, res) => {
  res.send("YouTube Clone API is running! 🚀");
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (User) {
      console.log("✅Password Reset Route is ACTIVE and READY!");
    }
  });
});