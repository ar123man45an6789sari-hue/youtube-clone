import Comment from "../models/Comment.js";

// Fetch all comments for a specific video
export const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ video: req.params.videoId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();
    
    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new comment
export const createComment = async (req, res) => {
  try {
    const { videoId, userName, text } = req.body;
    
    const newComment = await Comment.create({ 
      video: videoId, 
      userName, 
      text 
    });
    
    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};