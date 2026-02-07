import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadImageParams {
  file: File;
}

interface UploadImageResponse {
  id: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

const uploadImage = async (params: UploadImageParams) => {
  // 1. Generate presigned URL
  const data = await api.post<{
    data: { url: string; fields: Record<string, string>; key: string };
  }>("/api/upload/presign", {
    fileName: params.file.name,
    fileType: params.file.type,
  });

  const { url, fields, key } = data.data;

  // 2. Upload file to S3 using FormData as this is needed by the presigned URL
  const formData = new FormData();
  for (const [fieldKey, value] of Object.entries(fields)) {
    formData.append(fieldKey, value);
  }
  formData.append("file", params.file);

  const uploadResponse = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image");
  }

  // 3. Create file upload record
  return await api.post<{ data: UploadImageResponse }>("/api/upload/files", {
    s3Key: key,
    mimeType: params.file.type,
    fileName: params.file.name,
    fileSize: params.file.size,
  });
};

export const useUploadImage = (options: {
  queryKey: string[];
  enableToast: boolean;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadImage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: options.queryKey });
      if (options.enableToast) {
        toast.success("Image uploaded successfully");
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    },
  });
};
