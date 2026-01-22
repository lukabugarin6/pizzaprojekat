// config/multer.config.ts
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/images',
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
    },
  }),

  fileFilter: (_req, file, cb) => {
    // ✅ proveri MIME
    const okMime = /^image\/(jpeg|png|gif)$/i.test(file.mimetype);

    // ✅ (opciono) proveri i ekstenziju
    const okExt = /\.(jpg|jpeg|png|gif)$/i.test(file.originalname);

    if (!okMime || !okExt) {
      return cb(
        new BadRequestException(
          `Only jpg/jpeg/png/gif allowed (got ${file.mimetype})`,
        ),
        false,
      );
    }

    cb(null, true);
  },
};
