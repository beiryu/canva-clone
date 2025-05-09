export type ResponseUploadedFile = {
  fullPath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
};

export type RequestUploadFile = {
  file: File;
  userId: string;
  projectId: string;
  prefix?: string;
};

export type RequestUploadRemoteImage = {
  imageUrl: string;
  userId: string;
  projectId: string;
  prefix?: string;
};
