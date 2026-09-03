import Video from "../models/Video.js";

const getVideos = async (req, res) => {
  try {
    const videos = await Video.find({}).populate("channel", "name");
    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate("channel", "name");
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }
    res.status(200).json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createVideo = async (req, res) => {
  try {
    const video = await Video.create(req.body);
    res.status(201).json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Views count badhao
const incrementViews = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }
    video.views += 1;
    await video.save();
    res.status(200).json({ success: true, views: video.views });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Like/Dislike toggle
const toggleLike = async (req, res) => {
  try {
    const { userId } = req.body; // Frontend se user ID aayegi
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    // Check if already liked
    const alreadyLiked = video.likes.includes(userId);
    
    if (alreadyLiked) {
      // Unlike karo
      video.likes = video.likes.filter(id => id.toString() !== userId);
    } else {
      // Like karo (aur dislike hatao agar hai toh)
      video.likes.push(userId);
      video.dislikes = video.dislikes.filter(id => id.toString() !== userId);
    }
    
    await video.save();
    res.status(200).json({ success: true, likes: video.likes.length, dislikes: video.dislikes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleDislike = async (req, res) => {
  try {
    const { userId } = req.body;
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    const alreadyDisliked = video.dislikes.includes(userId);
    
    if (alreadyDisliked) {
      video.dislikes = video.dislikes.filter(id => id.toString() !== userId);
    } else {
      video.dislikes.push(userId);
      video.likes = video.likes.filter(id => id.toString() !== userId);
    }
    
    await video.save();
    res.status(200).json({ success: true, likes: video.likes.length, dislikes: video.dislikes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Fetch all videos uploaded by a specific channel
const getVideosByChannel = async (req, res) => {
  try {
    const videos = await Video.find({ channel: req.params.channelId })
      .populate("channel", "name")
      .sort({ createdAt: -1 }); // Newest videos first

    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Search videos by title or description (case-insensitive)
const searchVideos = async (req, res) => {
  try {
    const query = req.query.q || "";

    const videos = await Video.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    }).populate("channel", "name");

    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export {
  getVideos,
  getVideoById,
  createVideo,
  incrementViews,
  toggleLike,
  toggleDislike,
  getVideosByChannel,
  searchVideos,
};