import Link from "next/link";
import { AlertTriangle, Loader, Search, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useGetImages } from "@/features/images/api/use-get-images";
import { useUploadImage } from "@/features/images/api/use-upload-image";

import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getImageUrl } from "@/features/images/utils";
import Image from "next/image";
interface ImageSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
  projectId: string;
}

export const ImageSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
  projectId,
}: ImageSidebarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const {
    unsplashImages,
    uploadedImages,
    isLoadingStock,
    isErrorStock,
    isFetchingStock,
    isLoadingUploads,
    isErrorUploads,
  } = useGetImages(debouncedSearch);

  const { mutate: uploadImage, isPending: isUploading } = useUploadImage();

  const onClose = () => {
    setSearch("");
    onChangeActiveTool("select");
  };

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
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <aside
      className={cn(
        "bg-black relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "images" ? "visible" : "hidden",
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
                Your Uploads
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex-1">
                Stock Images
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
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search photos..."
                className="h-9 pl-8 pr-14"
              />
              {isFetchingStock && (
                <Loader className="absolute right-8 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
              )}
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

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
                  {debouncedSearch
                    ? `No results for "${debouncedSearch}"`
                    : "No stock images available"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {unsplashImages.map((image) => (
                  <button
                    onClick={() => editor?.addImage(image.urls.regular)}
                    key={image.id}
                    className="relative w-full h-[100px] group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border"
                  >
                    <Image
                      src={image?.urls?.small || image?.urls?.thumb}
                      alt={image.alt_description || "Image"}
                      className="object-cover w-full h-full"
                      loading="lazy"
                      fill
                    />
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
        </Tabs>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
