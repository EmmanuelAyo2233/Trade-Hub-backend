import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary with your credentials (set in .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for KYC documents (ID + selfie)
const kycStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'tradehub/kyc',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id:      `${file.fieldname}-${Date.now()}`,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  }),
});

// Storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'tradehub/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id:      `product-${Date.now()}`,
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  }),
});

// Storage for avatar images
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'tradehub/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id:      `avatar-${Date.now()}`,
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
  }),
});

function fileFilter(req, file, cb) {
  const filetypes = /jpe?g|png|webp/;
  const mimetypes = /image\/jpe?g|image\/png|image\/webp/;
  if (filetypes.test(file.originalname.toLowerCase().split('.').pop()) && mimetypes.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Images only! (jpg, jpeg, png, webp)'), false);
  }
}

// Named exports for specific use-cases
export const uploadKYC = multer({ storage: kycStorage, fileFilter });
export const uploadProduct = multer({ storage: productStorage, fileFilter });
export const uploadAvatar = multer({ storage: avatarStorage, fileFilter });

// Generic fallback (uses product storage by default)
export default multer({ storage: productStorage, fileFilter });
