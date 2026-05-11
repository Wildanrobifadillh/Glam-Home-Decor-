const prisma = require("../../config/prisma");

const STORE_PROFILE_KEY = "MAIN";

const getDefaultStoreProfileData = () => ({
  key: STORE_PROFILE_KEY,
  name: "Glam Home Decor",
  legalName: "Glam Home Decor",
  brandShortName: "GHD",
  address:
    "Jl. Ir. H. Juanda No.100c, Panyingkiran, Kec. Bungursari, Kab. Tasikmalaya, Jawa Barat 46151",
  phone: "081228811006",
  email: null,
  website: null,
  socialMedia: "Instagram @glamhome_decor",
  logoUrl: null,
  taxNumber: null,
  businessNumber: null,
});

const normalizeEmptyString = (value) => {
  if (value === "") {
    return null;
  }

  return value;
};

const getStoreProfile = async () => {
  return prisma.storeProfile.upsert({
    where: {
      key: STORE_PROFILE_KEY,
    },
    update: {},
    create: getDefaultStoreProfileData(),
  });
};

const updateStoreProfile = async (data) => {
  return prisma.storeProfile.upsert({
    where: {
      key: STORE_PROFILE_KEY,
    },
    update: {
      name: data.name,
      legalName: normalizeEmptyString(data.legalName),
      brandShortName: normalizeEmptyString(data.brandShortName),
      address: normalizeEmptyString(data.address),
      phone: normalizeEmptyString(data.phone),
      email: normalizeEmptyString(data.email),
      website: normalizeEmptyString(data.website),
      socialMedia: normalizeEmptyString(data.socialMedia),
      logoUrl: normalizeEmptyString(data.logoUrl),
      taxNumber: normalizeEmptyString(data.taxNumber),
      businessNumber: normalizeEmptyString(data.businessNumber),
    },
    create: {
      key: STORE_PROFILE_KEY,
      name: data.name,
      legalName: normalizeEmptyString(data.legalName),
      brandShortName: normalizeEmptyString(data.brandShortName),
      address: normalizeEmptyString(data.address),
      phone: normalizeEmptyString(data.phone),
      email: normalizeEmptyString(data.email),
      website: normalizeEmptyString(data.website),
      socialMedia: normalizeEmptyString(data.socialMedia),
      logoUrl: normalizeEmptyString(data.logoUrl),
      taxNumber: normalizeEmptyString(data.taxNumber),
      businessNumber: normalizeEmptyString(data.businessNumber),
    },
  });
};

module.exports = {
  getStoreProfile,
  updateStoreProfile,
};