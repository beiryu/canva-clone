import Link from "next/link";
import { AlertTriangle, Loader, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { ImageSearchInput } from "@/features/editor/components/image-search-input";

import { useGetImages } from "@/features/images/api/use-get-images";
import { useGetGoogleImages } from "@/features/images/api/use-get-google-images";
import { useImportImage } from "@/features/images/api/use-import-image";
import { useUploadImage } from "@/features/images/api/use-upload-image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getImageUrl } from "@/features/images/utils";
import Image from "next/image";
interface ImageSidebarProps {
  editor: Editor | undefined;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const ImageSidebar = ({
  editor,
  isOpen,
  onClose,
  projectId,
}: ImageSidebarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submitted queries — only updated when the user presses Enter.
  const [search, setSearch] = useState("");
  const [googleSearch, setGoogleSearch] = useState("");

  // Tracks which search result is being re-hosted, so its tile can show a spinner.
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  const {
    unsplashImages,
    uploadedImages,
    isLoadingStock,
    isErrorStock,
    isLoadingUploads,
    isErrorUploads,
  } = useGetImages(search);

  const {
    data: googleImages,
    isLoading: isLoadingGoogle,
    isError: isErrorGoogle,
  } = useGetGoogleImages(googleSearch);

  const { mutate: uploadImage, isPending: isUploading } = useUploadImage();
  const { mutateAsync: importImage } = useImportImage();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadImage({
        image: file,
        projectId,
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Both Google and Unsplash results are re-hosted on Supabase before they hit
  // the canvas: Google because those hosts serve no CORS headers, Unsplash so a
  // project stops depending on an external CDN and the image lands in Uploads.
  const handleRemoteImageClick = async (
    imageUrl: string,
    source: "google" | "unsplash",
    downloadLocation?: string,
  ) => {
    if (importingUrl) return;

    setImportingUrl(imageUrl);

    try {
      const { data } = await importImage({
        imageUrl,
        projectId,
        source,
        downloadLocation,
      });

      if (data?.fullPath) {
        editor?.addImage(getImageUrl(data.fullPath));
      }
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setImportingUrl(null);
    }
  };

  return (
    <aside
      className={cn(
        "bg-black relative border-r z-[40] w-[360px] h-full flex flex-col",
        isOpen ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Images"
        description="Add images to your canvas"
      />
      <div className="p-4 border-b">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <Button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="w-full text-sm font-medium bg-primary text-black"
        >
          {isUploading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </>
          )}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <Tabs defaultValue="uploaded" className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="uploaded" className="flex-1">
                Uploads
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex-1">
                Stock
              </TabsTrigger>
              <TabsTrigger value="google" className="flex-1">
                Google
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="uploaded" className="p-4 pt-2">
            {isLoadingUploads ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="size-4 text-muted-foreground animate-spin" />
              </div>
            ) : isErrorUploads ? (
              <div className="flex flex-col gap-y-4 items-center justify-center py-8">
                <AlertTriangle className="size-4 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">
                  Failed to fetch images
                </p>
              </div>
            ) : uploadedImages && uploadedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {uploadedImages.map((image) => (
                  <button
                    onClick={() =>
                      editor?.addImage(getImageUrl(image.fullPath))
                    }
                    key={image.id}
                    className="relative w-full h-[100px] group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border"
                  >
                    <Image
                      src={getImageUrl(image.fullPath)}
                      alt={image.fileName || "Uploaded Image"}
                      className="object-cover w-full h-full"
                      loading="lazy"
                      fill
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm mb-4">
                  No uploaded images yet
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stock" className="p-4 pt-2">
            <ImageSearchInput onSearch={setSearch} />

            {isLoadingStock ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="size-4 text-muted-foreground animate-spin" />
              </div>
            ) : isErrorStock ? (
              <div className="flex flex-col gap-y-4 items-center justify-center py-8">
                <AlertTriangle className="size-4 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">
                  Failed to fetch images
                </p>
              </div>
            ) : unsplashImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm text-center">
                  {search
                    ? `No results for "${search}"`
                    : "No stock images available"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {unsplashImages.map((image) => (
                  <button
                    onClick={() =>
                      handleRemoteImageClick(
                        image.urls.regular,
                        "unsplash",
                        image.links.download_location,
                      )
                    }
                    disabled={Boolean(importingUrl)}
                    key={image.id}
                    className="relative w-full h-[100px] group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border disabled:cursor-not-allowed"
                  >
                    <Image
                      src={image?.urls?.small || image?.urls?.thumb}
                      alt={image.alt_description || "Image"}
                      className="object-cover w-full h-full"
                      loading="lazy"
                      fill
                    />
                    {importingUrl === image.urls.regular && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Loader className="size-4 text-white animate-spin" />
                      </div>
                    )}
                    <Link
                      target="_blank"
                      href={image.links.html}
                      className="opacity-0 group-hover:opacity-100 absolute left-0 bottom-0 w-full text-[10px] truncate text-white hover:underline p-1 bg-black/50 text-left"
                    >
                      {image.user.name}
                    </Link>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="google" className="p-4 pt-2">
            <ImageSearchInput
              onSearch={setGoogleSearch}
              placeholder="Search Google Images..."
            />

            {!googleSearch ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm text-center">
                  Search Google for images
                </p>
              </div>
            ) : isLoadingGoogle ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="size-4 text-muted-foreground animate-spin" />
              </div>
            ) : isErrorGoogle ? (
              <div className="flex flex-col gap-y-4 items-center justify-center py-8">
                <AlertTriangle className="size-4 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">
                  Failed to search images
                </p>
              </div>
            ) : !googleImages || googleImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm text-center">
                  {`No results for "${googleSearch}"`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {googleImages.map((image) => (
                  <button
                    onClick={() =>
                      handleRemoteImageClick(image.imageUrl, "google")
                    }
                    disabled={Boolean(importingUrl)}
                    key={image.imageUrl}
                    className="relative w-full h-[100px] group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border disabled:cursor-not-allowed"
                  >
                    <Image
                      src={image.thumbnailUrl}
                      alt={image.title || "Image"}
                      className="object-cover w-full h-full"
                      loading="lazy"
                      fill
                    />
                    {importingUrl === image.imageUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Loader className="size-4 text-white animate-spin" />
                      </div>
                    )}
                    <Link
                      target="_blank"
                      href={image.link}
                      className="opacity-0 group-hover:opacity-100 absolute left-0 bottom-0 w-full text-[10px] truncate text-white hover:underline p-1 bg-black/50 text-left"
                    >
                      {image.source}
                    </Link>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
