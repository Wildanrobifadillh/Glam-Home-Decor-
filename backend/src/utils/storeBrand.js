const DEFAULT_STORE_NAME = "GHD Home Decor";
const DEFAULT_STORE_SOCIAL_MEDIA = "Instagram @ghdhome_decor";

const getStoreName = (store) =>
  store?.name?.trim() || DEFAULT_STORE_NAME;

const getStoreSocialMedia = (store) =>
  store?.socialMedia?.trim() || DEFAULT_STORE_SOCIAL_MEDIA;

module.exports = {
  DEFAULT_STORE_NAME,
  DEFAULT_STORE_SOCIAL_MEDIA,
  getStoreName,
  getStoreSocialMedia,
};