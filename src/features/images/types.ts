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
    // Unsplash API Guidelines: picking a photo must fire a download event.
    download_location: string;
  };
  user: {
    name: string;
  };
};

// Normalized shape returned by GET /api/images/google. `imageUrl` points at an
// arbitrary third-party host, so it is never loaded by the browser directly —
// it goes through POST /api/images/import to be re-hosted on Supabase first.
export type GoogleImage = {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: string;
  link: string;
  width: number;
  height: number;
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
