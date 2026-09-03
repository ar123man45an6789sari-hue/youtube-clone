import Channel from "../models/Channel.js";

const getChannels = async (req, res) => {
  try {
    const channels = await Channel.find({}).populate("user", "name email");
    res.status(200).json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createChannel = async (req, res) => {
  try {
    const channel = await Channel.create(req.body);
    res.status(201).json({ success: true, data: channel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { getChannels, createChannel };