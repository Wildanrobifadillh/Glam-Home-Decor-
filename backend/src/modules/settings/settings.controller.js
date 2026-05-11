const settingsService = require("./settings.service");
const { updateStoreProfileSchema } = require("./settings.validation");

const getStoreProfile = async (req, res, next) => {
  try {
    const storeProfile = await settingsService.getStoreProfile();

    return res.status(200).json({
      success: true,
      message: "Store profile retrieved successfully",
      data: {
        storeProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateStoreProfile = async (req, res, next) => {
  try {
    const validatedData = updateStoreProfileSchema.parse(req.body);

    const storeProfile = await settingsService.updateStoreProfile(validatedData);

    return res.status(200).json({
      success: true,
      message: "Store profile updated successfully",
      data: {
        storeProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStoreProfile,
  updateStoreProfile,
};