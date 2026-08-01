import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
// @ts-ignore
import toStream = require('buffer-to-stream');

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'e-learning/classes',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return this.uploadFile(file, folder, 'image');
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'e-learning/general',
    resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error) return reject(error);
          if (result) resolve(result);
          else reject(new Error('Upload failed without returning error'));
        },
      );

      toStream(file.buffer).pipe(upload);
    });
  }
}
