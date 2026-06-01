import { useMutation } from "@tanstack/react-query";
import { authService } from "../lib/api-util";

export const useDeleteStoredFileMutation = () => useMutation({
    mutationFn: (objectKey: string) => authService.deleteData(`/storage/files/${objectKey}`),
});

export const useUploadFileMutation = () => useMutation({
    mutationFn: ({ file, module, category }: { file: File; module: string; category: string }) => {
        const formData = new FormData();
        formData.append("file", file);
        return authService.postData(`/storage/upload?module=${module}&category=${category}`, formData);
    },
});
