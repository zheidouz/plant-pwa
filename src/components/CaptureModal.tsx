/**
 * `CaptureModal` — opens the device camera via `getUserMedia` with a
 * shutter button. Falls back to a hidden `<input type="file" accept="image/*"
 * capture="environment">` for browsers / devices where the live preview
 * path is unavailable or denied.
 *
 * On capture, runs the captured blob through `resizeImageToBlob` (≤1MB
 * JPEG) and emits a `dataURL` plus the resulting image element to the
 * parent so the OrganSelector can pick a smart default.
 */

import { useEffect, useRef, useState } from "react";
import { resizeImageToBlob } from "../lib/resizeImage";

export interface CaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (payload: { image: HTMLImageElement; dataUrl: string; blob: Blob }) => void;
}

export default function CaptureModal({ open, onClose, onCapture }: CaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Boot the camera as soon as the modal opens. Stop tracks on close.
  useEffect(() => {
    if (!open) {
      stopStream();
      setStreamError(null);
      setBusy(false);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStreamError("Camera API not available in this browser. Use the upload option below.");
      return;
    }
    let cancelled = false;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStreamError(null);
      } catch (err) {
        if (!cancelled) {
          setStreamError(
            "Couldn't access the camera. Please grant permission, or use the upload option below.",
          );
        }
      }
    })();

    function stopStream() {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open]);

  if (!open) return null;

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || busy) return;
    setBusy(true);
    try {
      const dataUrl = snapshotFromVideo(video);
      const blob = await (await fetch(dataUrl)).blob();
      const resized = await resizeImageToBlob(blob);
      const img = await blobToImage(resized);
      onCapture({ image: img, dataUrl: URL.createObjectURL(resized), blob: resized });
    } catch (err) {
      setStreamError(`Capture failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const resized = await resizeImageToBlob(file);
      const img = await blobToImage(resized);
      onCapture({ image: img, dataUrl: URL.createObjectURL(resized), blob: resized });
    } catch (err) {
      setStreamError(`Upload failed: ${String(err)}`);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Capture a plant"
      className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-base font-semibold">Identify a plant</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {!streamError ? (
          <video
            ref={videoRef}
            className="max-h-full max-w-full object-contain"
            playsInline
            muted
          />
        ) : (
          <div className="px-6 text-center">
            <p className="text-sm text-white/80">{streamError}</p>
            <label className="mt-3 inline-block cursor-pointer rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
              Upload from gallery
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {!streamError && (
        <div className="flex flex-col items-center gap-3 px-4 pb-6 pt-2">
          <button
            type="button"
            onClick={handleShutter}
            disabled={busy}
            aria-label="Take photo"
            data-testid="shutter"
            className="h-16 w-16 rounded-full border-4 border-white bg-white/30 text-2xl transition active:scale-95 disabled:opacity-50"
          >
            <span aria-hidden>📸</span>
          </button>
          <label className="text-xs text-white/70 underline-offset-2 hover:underline">
            Or upload from gallery
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function snapshotFromVideo(video: HTMLVideoElement): string {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.92);
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}
