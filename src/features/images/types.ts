// Normalized shape returned by GET /api/images/unsplash. Field names mirror
// Unsplash's own so the sidebar reads the same properties for both the random
// collection and search results.
export type StockImage = {
  id: string;
  alt_description: string | null;
  urls: {
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    html: string;
  };
  user: {
    name: string;
  };
};

export type ResponseUploadedFile = {
  path: string;
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
  bucketName?: string;
};

export type RequestUploadRemoteImage = {
  imageUrl: string;
  userId: string;
  projectId: string;
  prefix?: string;
  bucketName?: string;
};
