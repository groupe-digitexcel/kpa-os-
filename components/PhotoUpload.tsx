"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStudentPhoto } from "@/lib/actions/students";

const MAX_WIDTH = 240;
const MAX_HEIGHT = 300;

export default function PhotoUpload({ studentId, currentPhotoUrl }: { studentId: string; currentPhotoUrl?: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resizeAndCompress(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas not supported"));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.onerror = () => reject(new Error("Could not read image"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Choisissez une image (JPEG/PNG).");
      return;
    }

    try {
      const dataUrl = await resizeAndCompress(file);
      setPreview(dataUrl);
      startTransition(async () => {
        const result = await updateStudentPhoto(studentId, dataUrl);
        if (result.error) setError(result.error);
        router.refresh();
      });
    } catch {
      setError("Impossible de traiter cette image.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-16 bg-kpa-cream rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center flex-none">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[9px] text-gray-400 text-center">Photo</span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="text-xs bg-white border border-gray-300 text-kpa-navy font-semibold px-3 py-1.5 rounded-lg hover:bg-kpa-cream disabled:opacity-50"
        >
          {isPending ? "Envoi..." : preview ? "Changer la photo" : "Ajouter une photo"}
        </button>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
