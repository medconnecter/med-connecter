const { s3Client, getSignedUrl } = require('../../config/aws.config');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

class S3Service {
  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
  }

  // Generate pre-signed URL for file upload
  async getUploadUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Generate pre-signed URL for file download
  async getDownloadUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Upload file directly to S3
  async uploadFile(key, body, contentType) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType
    });

    return await s3Client.send(command);
  }

  // Delete file from S3
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });

    return await s3Client.send(command);
  }
}

module.exports = new S3Service(); 