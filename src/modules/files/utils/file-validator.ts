export const FILE_SIGNATURES: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF
};

export class FileValidator {
  // 校验MIME类型
  static validateMime(mime: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mime);
  }

  // 校验文件魔数（文件头）
  static validateFileSignature(buffer: Buffer, expectedMime: string): boolean {
    const signature = FILE_SIGNATURES[expectedMime];
    if (!signature) {
      // 位置类型，跳过魔数校验
      return true;
    }

    // 检查文件头是否匹配
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  // 清理文件名，防止路径遍历攻击
  static sanitizeFilename(filename: string): string {
    // 移除路径分隔符和特殊字符
    return filename
      .replace(/[/\\]/g, '')
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .trim();
  }

  // 生成存储路径
  static generateStoragePath(
    tenantId: string,
    filename: string,
    uploadId: string,
  ): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sanitized = this.sanitizeFilename(filename);
    const ext = sanitized.split('.').pop();
    const basename = `${uploadId}.${ext}`;

    return `${tenantId}/${year}/${month}/${basename}`;
  }
}
