import Comment from "../models/Comment.js";
import { getClientInfo } from "../utils/clientInfo.js";

// own comment edit  time window (minutes)
const EDIT_LIMIT_MIN = 10;

// simple bad-words list for the profanity filter
const BAD_WORDS = [
  "fuck", "shit", "bitch", "bastard", "asshole",
  "madharchod", "bhosdike", "chutiya", "randi", "harami", "saala","RASCAL", "CHUTMARIKE","bhosda","chodu","gandu","lodu","lund","loda","lund kaat","lund kaatna","lund kaat ke khana","lund kaat ke  khana", "gand","sala","lauda",
];

const safeArrays = (comment) => {
  if (!Array.isArray(comment.likes)) comment.likes = [];
  if (!Array.isArray(comment.dislikes)) comment.dislikes = [];
  return comment;
};

// fetch all comments of a video (?sort=newest | oldest | mostLiked)
export const getComments = async (req, res) => {
  try {
    const sort = req.query.sort || "newest";
    const comments = (await Comment.find({ video: req.params.videoId }).lean()).map(
      (c) =>
        c.hidden
          ? { ...c, text: "[This comment was removed by a moderator]" }
          : c
    );

    if (sort === "oldest") {
      comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
       } else if (sort === "mostLiked") {
      comments.sort((a, b) => (b.likes || []).length - (a.likes || []).length);
    } else if (sort === "mostRelevant") {
      // relevance score = likes * 2 + number of replies
      const replyCount = (id) =>
        comments.filter((x) => String(x.parentId) === String(id)).length;
      comments.sort((a, b) => {
        const scoreA = (a.likes || []).length * 2 + replyCount(a._id);
        const scoreB = (b.likes || []).length * 2 + replyCount(b._id);
        return scoreB - scoreA;
      });
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
      // 4. emoji / special character flood check
    const letters = (text.match(/[\p{L}\p{N}]/gu) || []).length;
    if (text.trim().length >= 6 && letters / text.trim().length < 0.4) {
      return res.status(400).json({
        success: false,
        message: "Comment blocked: too many symbols or emojis.",
      });
    }

    // 5. malicious links block
    if (/(https?:\/\/|www\.)/i.test(text)) {
      return res.status(400).json({
        success: false,
        message: "Links are not allowed in comments.",
      });
    }

    // deleted parent comment should not get new replies
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "This comment was deleted, you cannot reply to it.",
        });
      }
    }

    // where the comment was posted from (shown next to the username)
    const info = await getClientInfo(req);

    // simple language guess from the characters used
    const guessLang = (value) => {
      if (/[\u0900-\u097F]/.test(value)) return "hi";
      if (/[\u0600-\u06FF]/.test(value)) return "ar";
      if (/[\u4E00-\u9FFF]/.test(value)) return "zh";
      if (/[\u0400-\u04FF]/.test(value)) return "ru";
      return "en";
    };

    const mentions = (text.match(/@[A-Za-z0-9_]+/g) || []).map((m) => m.slice(1));

    const newComment = await Comment.create({
      video: videoId,
      userId: owner,
      userName,
      avatar: req.body.avatar || "",
      text,
      parentId: parentId || null,
      city: info.city === "Unknown" ? "" : info.city,
      country: info.country === "Unknown" ? "" : info.country,
      lang: guessLang(text),
      mentions,
    });

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// like / dislike toggle 
export const reactComment = async (req, res) => {
  try {
    const { userId } = req.body;
    const type = req.params.type; // "like" or "dislike"

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
      my.splice(index, 1); 
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

// edit own comment 
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

    if (comment.deleted) {
      return res
        .status(400)
        .json({ success: false, message: "Deleted comments cannot be edited" });
    }

    const minutesOld = (Date.now() - new Date(comment.createdAt)) / 60000;
    if (minutesOld > EDIT_LIMIT_MIN) {
      return res.status(403).json({ success: false, message: "Edit time limit (10 minutes) is over" });
    }

    // simultaneous edit protection: the client sends the version it edited
    const { knownEditedAt } = req.body;
    if (
      knownEditedAt !== undefined &&
      String(comment.editedAt || "") !== String(knownEditedAt || "")
    ) {
      return res.status(409).json({
        success: false,
        message: "This comment was just updated somewhere else. Please reload.",
      });
    }

    comment.text = text;
    comment.mentions = (text.match(/@[A-Za-z0-9_]+/g) || []).map((m) => m.slice(1));
    comment.editCount = (comment.editCount || 0) + 1;
    comment.editedAt = new Date();
    await comment.save();
    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// delete own comment
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

    // if replies exist, keep the thread alive with a placeholder (soft delete)
    const replyCount = await Comment.countDocuments({ parentId: comment._id });
    if (replyCount > 0) {
      comment.text = "[This comment was deleted by the author]";
      comment.deleted = true;
      comment.mentions = [];
      await comment.save();
      return res
        .status(200)
        .json({ success: true, softDeleted: true, data: comment });
    }

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
        // same user can't report the same comment multiple times
    const already = comment.reports.some(
      (r) => r.reportedBy === (userId || "guest")
    );
    if (already) {
      return res.status(400).json({
        success: false,
        message: "You already reported this comment.",
      });
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

// moderator action on a reported comment: hide it or dismiss the reports
export const moderateComment = async (req, res) => {
  try {
    const { action, by } = req.body; // action = hide | unhide | dismiss
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    if (action === "hide") {
      comment.hidden = true;
    } else if (action === "unhide") {
      comment.hidden = false;
    } else if (action === "dismiss") {
      comment.reported = false;
      comment.reports = [];
    } else {
      return res.status(400).json({ success: false, message: "Unknown action" });
    }

    comment.moderation.push({ action, by: by || "admin", at: new Date() });
    await comment.save();
    res.status(200).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// moderation list:
export const getReportedComments = async (req, res) => {
  try {
    const list = await Comment.find({ reported: true }).sort({ updatedAt: -1 }).lean();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};