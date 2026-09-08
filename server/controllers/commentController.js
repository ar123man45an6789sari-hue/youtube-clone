import Comment from "../models/Comment.js";

// own comment edit karne ka time window (minutes)
const EDIT_LIMIT_MIN = 10;

// simple bad-words list for the profanity filter
const BAD_WORDS = [
  "fuck", "shit", "bitch", "bastard", "asshole",
  "madarchod", "bhosdike", "chutiya", "randi", "harami", "saala","RASCAL", "CHUTMARIKE","bhosda","chodu","gandu","lodu","lund","loda","lund kaat","lund kaatna","lund kaat ke khana","lund kaat ke  khana","lund kaat ke  khana","lund kaat ke  khana","lund kaat ke khana","lund kaat ke  khana","lund kaat ke  khana","lund kaat ke  khana","lund kaat ke khanna", "gand",
];

// helper: purane comments mein likes/dislikes arrays na hon toh bana do
const safeArrays = (comment) => {
  if (!Array.isArray(comment.likes)) comment.likes = [];
  if (!Array.isArray(comment.dislikes)) comment.dislikes = [];
  return comment;
};

// fetch all comments of a video (?sort=newest | oldest | mostLiked)
export const getComments = async (req, res) => {
  try {
    const sort = req.query.sort || "newest";
    const comments = await Comment.find({ video: req.params.videoId }).lean();

    if (sort === "oldest") {
      comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === "mostLiked") {
      comments.sort((a, b) => (b.likes || []).length - (a.likes || []).length);
    } else {
      comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// create a comment (with profanity filter, duplicate check and rate limit)
export const createComment = async (req, res) => {
  try {
    const { videoId, userId, userName, text, parentId } = req.body;

    // 1. profanity filter: abusive language block
    const cleanText = (text || "").toLowerCase();
    const hasBadWord = BAD_WORDS.some((word) => cleanText.includes(word));
    if (hasBadWord) {
      return res.status(400).json({
        success: false,
        message: "Comment blocked: abusive language is not allowed.",
      });
    }

    const owner = userId || "";

    // 2. duplicate check: same text by same user within 10 minutes
    const duplicate = await Comment.findOne({
      video: videoId,
      userId: owner,
      text,
      createdAt: { $gte: new Date(Date.now() - 10 * 60000) },
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Duplicate comment! You already posted this.",
      });
    }

    // 3. rate limit: max 3 comments per minute per user
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentCount = await Comment.countDocuments({
      video: videoId,
      userId: owner,
      createdAt: { $gte: oneMinuteAgo },
    });
    if (recentCount >= 3) {
      return res.status(429).json({
        success: false,
        message: "Too many comments! Please wait a minute before posting again.",
      });
    }

    const newComment = await Comment.create({
      video: videoId,
      userId: owner,
      userName,
      text,
      parentId: parentId || null,
    });

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// like / dislike toggle (ek user = ek reaction)
export const reactComment = async (req, res) => {
  try {
    const { userId } = req.body;
    const type = req.params.type; // "like" ya "dislike"

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please sign in first" });
    }

    const comment = safeArrays(await Comment.findById(req.params.id));
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const my = type === "like" ? comment.likes : comment.dislikes;
    const other = type === "like" ? comment.dislikes : comment.likes;

    const index = my.indexOf(userId);
    if (index > -1) {
      my.splice(index, 1); // dobara click = reaction hat jao
    } else {
      my.push(userId);
      const otherIndex = other.indexOf(userId);
      if (otherIndex > -1) other.splice(otherIndex, 1);
    }

    await comment.save();
    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// edit own comment (sirf EDIT_LIMIT_MIN minutes ke andar)
export const updateComment = async (req, res) => {
  try {
    const { userId, text } = req.body;

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }
    if (!userId || comment.userId !== userId) {
      return res.status(403).json({ success: false, message: "You can only edit your own comment" });
    }

    const minutesOld = (Date.now() - new Date(comment.createdAt)) / 60000;
    if (minutesOld > EDIT_LIMIT_MIN) {
      return res.status(403).json({ success: false, message: "Edit time limit (10 minutes) is over" });
    }

    comment.text = text;
    comment.editedAt = new Date();
    await comment.save();
    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// delete own comment (saath mein uske replies bhi)
export const deleteComment = async (req, res) => {
  try {
    const { userId } = req.body;

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }
    if (!userId || comment.userId !== userId) {
      return res.status(403).json({ success: false, message: "You can only delete your own comment" });
    }

    await Comment.deleteMany({ parentId: comment._id });
    await comment.deleteOne();
    res.status(200).json({ success: true, data: { id: comment._id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// report a comment (spam / harassment / offensive)
export const reportComment = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    comment.reports.push({
      reason,
      reportedBy: userId || "guest",
      createdAt: new Date(),
    });
    comment.reported = true;
    await comment.save();

    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// moderation list: saare reported comments (admin page ke liye)
export const getReportedComments = async (req, res) => {
  try {
    const list = await Comment.find({ reported: true }).sort({ updatedAt: -1 }).lean();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};